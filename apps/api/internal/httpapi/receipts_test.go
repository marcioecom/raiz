package httpapi

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/marcioecom/raiz/apps/api/internal/points"
	"github.com/marcioecom/raiz/apps/api/internal/store"
)

// A real Capim Dourado receipt: Centauro, issued in November 2026.
const (
	centauroKey  = "17261106347409018889651210001017301655128527"
	centauroCNPJ = "06347409018889"
	leituraCNPJ  = "22582843000186"
	cinemaCNPJ   = "55666777000181"
)

var (
	receiptClock = time.Date(2026, 11, 13, 15, 0, 0, 0, time.UTC)

	storesMissionID   = "33333333-3333-3333-3333-333333333301"
	categoryMissionID = "33333333-3333-3333-3333-333333333302"
)

// stubReceipt mirrors the receipts row the stub keeps in memory.
type stubReceipt struct {
	ID         string
	VisitorID  string
	StoreID    *string
	AccessKey  string
	TotalCents *int
	IssuedAt   time.Time
	Points     int
	Source     string
	Status     string
}

type stubLedgerRow struct {
	ID           string
	VisitorID    string
	Kind         string
	Delta        int
	StoreName    *string
	MissionTitle *string
	CreatedAt    time.Time
}

type stubFetcher struct {
	cents int64
	ok    bool
	err   error
}

func (f stubFetcher) FetchTotal(context.Context, string) (int64, bool, error) {
	return f.cents, f.ok, f.err
}

func (s *stubStore) StoreByCNPJ(_ context.Context, cnpj string) (store.StoreInfo, error) {
	if info, ok := s.stores[cnpj]; ok {
		return info, nil
	}
	return store.StoreInfo{}, store.ErrNotFound
}

func (s *stubStore) ReceiptClaimed(_ context.Context, accessKey string) (bool, error) {
	for _, r := range s.receipts {
		if r.AccessKey == accessKey {
			return true, nil
		}
	}
	return false, nil
}

func (s *stubStore) ReceiptCounters(_ context.Context, visitorID string, storeID *string, day time.Time) (int, int, error) {
	start := time.Date(day.Year(), day.Month(), day.Day(), 0, 0, 0, 0, time.UTC)
	end := start.AddDate(0, 0, 1)

	var sameStore, today int
	for _, r := range s.receipts {
		if r.VisitorID != visitorID || r.IssuedAt.Before(start) || !r.IssuedAt.Before(end) {
			continue
		}
		today++
		if sameStoreID(r.StoreID, storeID) {
			sameStore++
		}
	}
	return sameStore, today, nil
}

func sameStoreID(a, b *string) bool {
	if a == nil || b == nil {
		return a == nil && b == nil
	}
	return *a == *b
}

func (s *stubStore) CreateReceipt(_ context.Context, in store.NewReceipt) (store.Receipt, error) {
	for _, r := range s.receipts {
		if r.AccessKey == in.AccessKey {
			// The unique constraint decides the race, exactly like Postgres.
			return store.Receipt{}, store.ErrAlreadyClaimed
		}
	}

	s.seq++
	created := store.Receipt{
		ID:       fmt.Sprintf("00000000-0000-4000-8000-%012d", s.seq),
		IssuedAt: in.IssuedAt,
	}
	s.receipts = append(s.receipts, stubReceipt{
		ID:         created.ID,
		VisitorID:  in.VisitorID,
		StoreID:    in.StoreID,
		AccessKey:  in.AccessKey,
		TotalCents: in.TotalCents,
		IssuedAt:   in.IssuedAt,
		Points:     in.Points,
		Source:     in.Source,
		Status:     in.Status,
	})
	s.appendLedger(stubLedgerRow{
		VisitorID: in.VisitorID,
		Kind:      "receipt",
		Delta:     in.Points,
		StoreName: s.storeName(in.StoreID),
	})
	return created, nil
}

func (s *stubStore) storeName(id *string) *string {
	if id == nil {
		return nil
	}
	for _, info := range s.stores {
		if info.ID == *id {
			name := info.Name
			return &name
		}
	}
	return nil
}

// appendLedger stamps a deterministic created_at so pages are stable.
func (s *stubStore) appendLedger(row stubLedgerRow) {
	s.seq++
	row.ID = fmt.Sprintf("99999999-9999-4999-8999-%012d", s.seq)
	row.CreatedAt = receiptClock.Add(time.Duration(s.seq) * time.Second)
	s.ledger = append(s.ledger, row)
}

func (s *stubStore) ReceiptHistory(_ context.Context, visitorID string, from time.Time) ([]points.ReceiptFact, error) {
	facts := make([]points.ReceiptFact, 0, len(s.receipts))
	for _, r := range s.receipts {
		if r.VisitorID != visitorID || r.IssuedAt.Before(from) {
			continue
		}
		fact := points.ReceiptFact{IssuedAt: r.IssuedAt}
		for cnpj, info := range s.stores {
			if r.StoreID != nil && info.ID == *r.StoreID {
				fact.StoreKey = cnpj
				fact.Category = info.Category
			}
		}
		facts = append(facts, fact)
	}
	return facts, nil
}

func (s *stubStore) Missions(_ context.Context, _ string) ([]store.MissionState, error) {
	states := make([]store.MissionState, 0, len(s.missions))
	for _, m := range s.missions {
		m.Counter = s.counters[m.ID]
		m.Completed = s.completed[m.ID]
		states = append(states, m)
	}
	return states, nil
}

func (s *stubStore) AwardMission(_ context.Context, visitorID string, u store.MissionUpdate) (int, error) {
	if u.Counter > s.counters[u.ID] {
		s.counters[u.ID] = u.Counter
	}
	if s.completed[u.ID] || s.counters[u.ID] < u.Target {
		return 0, nil
	}

	s.completed[u.ID] = true
	var title *string
	for _, m := range s.missions {
		if m.ID == u.ID {
			missionTitle := m.Title
			title = &missionTitle
		}
	}
	s.appendLedger(stubLedgerRow{
		VisitorID:    visitorID,
		Kind:         "mission",
		Delta:        u.RewardPoints,
		MissionTitle: title,
	})
	return u.RewardPoints, nil
}

func (s *stubStore) LedgerBalance(_ context.Context, visitorID string) (int, error) {
	balance := 0
	for _, row := range s.ledger {
		if row.VisitorID == visitorID {
			balance += row.Delta
		}
	}
	return balance, nil
}

func (s *stubStore) LedgerPage(_ context.Context, visitorID string, before *store.LedgerCursor, limit int) ([]store.LedgerRow, error) {
	rows := make([]store.LedgerRow, 0, len(s.ledger))
	for i := len(s.ledger) - 1; i >= 0; i-- {
		row := s.ledger[i]
		if row.VisitorID != visitorID {
			continue
		}
		if before != nil && !row.CreatedAt.Before(before.CreatedAt) {
			continue
		}
		rows = append(rows, store.LedgerRow{
			ID:           row.ID,
			Kind:         row.Kind,
			Delta:        row.Delta,
			StoreName:    row.StoreName,
			MissionTitle: row.MissionTitle,
			CreatedAt:    row.CreatedAt,
		})
		if len(rows) == limit {
			break
		}
	}
	return rows, nil
}

// newReceiptServer wires the stub with the partner stores, the demo missions
// and a fixed clock so the receipt rules are deterministic.
func newReceiptServer(t *testing.T) (*api, *stubStore, http.Handler, string) {
	t.Helper()

	handlers, st, h := newTestServer(t, true)
	handlers.now = func() time.Time { return receiptClock }

	st.stores[centauroCNPJ] = store.StoreInfo{ID: "11111111-1111-1111-1111-111111111106", Name: "Centauro", Category: "esportes"}
	st.stores[leituraCNPJ] = store.StoreInfo{ID: "11111111-1111-1111-1111-111111111107", Name: "Leitura Palmas", Category: "livraria"}
	st.stores["11222333000181"] = store.StoreInfo{ID: "11111111-1111-1111-1111-111111111101", Name: "Casa do Pão", Category: "alimentacao"}
	st.stores["33444555000181"] = store.StoreInfo{ID: "11111111-1111-1111-1111-111111111103", Name: "Studio Aurora", Category: "moda"}
	st.stores["44555666000181"] = store.StoreInfo{ID: "11111111-1111-1111-1111-111111111104", Name: "Farmácia Bem Viver", Category: "saude"}
	st.stores[cinemaCNPJ] = store.StoreInfo{ID: "11111111-1111-1111-1111-111111111105", Name: "Cinema Lumière", Category: "entretenimento"}

	st.missions = []store.MissionState{
		{Mission: points.Mission{ID: storesMissionID, Title: "Compre em 3 lojas diferentes em 7 dias", RuleType: points.RuleStores, Target: 3, RewardPoints: 150}},
		{Mission: points.Mission{ID: categoryMissionID, Title: "Alimentação + moda na mesma semana", RuleType: points.RuleCategory, Target: 2, RewardPoints: 100}},
	}

	visitor, err := st.CreateVisitor(context.Background(), "hash", mustEncrypt(t, handlers, "63999990010"), "Maria")
	if err != nil {
		t.Fatalf("seeding visitor: %v", err)
	}
	return handlers, st, h, mustSign(t, "test-jwt-secret-long-enough", visitor.ID)
}

func visitorIDOf(t *testing.T, st *stubStore) string {
	t.Helper()
	for _, v := range st.visitors {
		return v.ID
	}
	t.Fatal("no visitor seeded")
	return ""
}

// makeKey builds a valid access key: state 17 (TO), month yymm, NFC-e model.
func makeKey(yymm, cnpj string, number int) string {
	base := fmt.Sprintf("17%s%s65%03d%09d1%s", yymm, cnpj, 121, number, "65512852")
	return base + fmt.Sprint(keyCheckDigit(base))
}

func keyCheckDigit(base string) int {
	sum, weight := 0, 2
	for i := len(base) - 1; i >= 0; i-- {
		sum += int(base[i]-'0') * weight
		weight++
		if weight > 9 {
			weight = 2
		}
	}
	if dv := 11 - sum%11; dv < 10 {
		return dv
	}
	return 0
}

func postReceipt(t *testing.T, h http.Handler, token, accessKey string) *httptest.ResponseRecorder {
	t.Helper()
	return doJSON(t, h, http.MethodPost, "/v1/receipts", map[string]string{"access_key": accessKey}, token)
}

func decodeReceipt(t *testing.T, rec *httptest.ResponseRecorder) receiptResult {
	t.Helper()

	var body receiptResult
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("decoding receipt response %q: %v", rec.Body.String(), err)
	}
	return body
}

func errorField(t *testing.T, rec *httptest.ResponseRecorder) string {
	t.Helper()

	var envelope struct {
		Error struct {
			Details map[string]string `json:"details"`
		} `json:"error"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &envelope); err != nil {
		t.Fatalf("decoding error details %q: %v", rec.Body.String(), err)
	}
	return envelope.Error.Details["field"]
}

func TestCreateReceiptCreditsTheBaseValue(t *testing.T) {
	_, st, h, token := newReceiptServer(t)

	rec := postReceipt(t, h, token, centauroKey)
	if rec.Code != http.StatusCreated {
		t.Fatalf("receipt status = %d, want 201 (%s)", rec.Code, rec.Body.String())
	}

	body := decodeReceipt(t, rec)
	if body.Receipt.PointsAwarded != 10 || body.Balance != 10 {
		t.Errorf("receipt = %+v, want 10 points and balance 10", body.Receipt)
	}
	if body.Receipt.Status != "accepted" || body.Receipt.StoreName == nil || *body.Receipt.StoreName != "Centauro" {
		t.Errorf("receipt = %+v, want accepted at Centauro", body.Receipt)
	}
	if body.Receipt.TotalCents != nil {
		t.Errorf("total_cents = %d, want null without SEFAZ", *body.Receipt.TotalCents)
	}
	if len(st.receipts) != 1 || st.receipts[0].AccessKey != centauroKey {
		t.Errorf("stored receipts = %+v, want the scanned key", st.receipts)
	}
	if len(st.ledger) != 1 || st.ledger[0].Kind != "receipt" || st.ledger[0].Delta != 10 {
		t.Errorf("ledger = %+v, want one receipt credit of 10", st.ledger)
	}
}

func TestCreateReceiptRejectsDuplicate(t *testing.T) {
	_, st, h, token := newReceiptServer(t)

	if rec := postReceipt(t, h, token, centauroKey); rec.Code != http.StatusCreated {
		t.Fatalf("first receipt = %d, want 201 (%s)", rec.Code, rec.Body.String())
	}

	rec := postReceipt(t, h, token, centauroKey)
	if rec.Code != http.StatusConflict || errorCode(t, rec) != "already_claimed" {
		t.Fatalf("duplicate = %d %s, want 409 already_claimed", rec.Code, rec.Body.String())
	}
	if balance, _ := st.LedgerBalance(context.Background(), visitorIDOf(t, st)); balance != 10 {
		t.Errorf("balance after duplicate = %d, want 10", balance)
	}
}

func TestCreateReceiptRejectsInvalidKey(t *testing.T) {
	_, _, h, token := newReceiptServer(t)

	cases := map[string]string{
		"short":       "1726110634740901888965121000101730165512852",
		"check digit": "17261106347409018889651210001017301655128528",
		"letters":     "1726110634740901888965121000101730165512852X",
	}
	for name, key := range cases {
		rec := postReceipt(t, h, token, key)
		if rec.Code != http.StatusUnprocessableEntity {
			t.Errorf("%s = %d, want 422 (%s)", name, rec.Code, rec.Body.String())
			continue
		}
		if field := errorField(t, rec); field != "access_key" {
			t.Errorf("%s details.field = %q, want access_key", name, field)
		}
		if name == "short" && errorCode(t, rec) != "invalid_length" {
			t.Errorf("short key = %q, want invalid_length", errorCode(t, rec))
		}
	}
}

func TestCreateReceiptEnforcesTheAntifraudWindow(t *testing.T) {
	_, _, h, token := newReceiptServer(t)

	// September key scanned in November: far past the 72h window.
	rec := postReceipt(t, h, token, makeKey("2609", centauroCNPJ, 1))
	if rec.Code != http.StatusUnprocessableEntity || errorCode(t, rec) != "receipt_too_old" {
		t.Fatalf("old receipt = %d %s, want 422 receipt_too_old", rec.Code, rec.Body.String())
	}
}

func TestCreateReceiptEnforcesDailyLimits(t *testing.T) {
	_, _, h, token := newReceiptServer(t)

	if rec := postReceipt(t, h, token, centauroKey); rec.Code != http.StatusCreated {
		t.Fatalf("first receipt = %d, want 201 (%s)", rec.Code, rec.Body.String())
	}

	// Same store, another key, same day.
	rec := postReceipt(t, h, token, makeKey("2611", centauroCNPJ, 2))
	if rec.Code != http.StatusUnprocessableEntity || errorCode(t, rec) != "store_daily_limit" {
		t.Fatalf("second receipt from the same store = %d %s, want 422 store_daily_limit", rec.Code, rec.Body.String())
	}

	// Four more stores: the fifth of the day still passes, the sixth does not.
	for i, cnpj := range []string{leituraCNPJ, "11222333000181", "33444555000181", "44555666000181"} {
		if rec := postReceipt(t, h, token, makeKey("2611", cnpj, 10+i)); rec.Code != http.StatusCreated {
			t.Fatalf("receipt %d = %d, want 201 (%s)", i+2, rec.Code, rec.Body.String())
		}
	}
	rec = postReceipt(t, h, token, makeKey("2611", cinemaCNPJ, 20))
	if rec.Code != http.StatusUnprocessableEntity || errorCode(t, rec) != "daily_limit_reached" {
		t.Fatalf("sixth receipt = %d %s, want 422 daily_limit_reached", rec.Code, rec.Body.String())
	}
}

func TestCreateReceiptUnknownStoreScoresBaseAndGoesToReview(t *testing.T) {
	handlers, _, h, token := newReceiptServer(t)
	// Enrichment would return a total, but an unknown store still gets 10.
	handlers.sefaz = stubFetcher{cents: 4550, ok: true}

	rec := postReceipt(t, h, token, makeKey("2611", "99999999000199", 1))
	if rec.Code != http.StatusCreated {
		t.Fatalf("unknown store = %d, want 201 (%s)", rec.Code, rec.Body.String())
	}

	body := decodeReceipt(t, rec)
	if body.Receipt.PointsAwarded != 10 || body.Receipt.Status != "review" {
		t.Errorf("receipt = %+v, want 10 points and review status", body.Receipt)
	}
	if body.Receipt.StoreName != nil || body.Receipt.Category != nil {
		t.Errorf("store = %v/%v, want both null", body.Receipt.StoreName, body.Receipt.Category)
	}
}

func TestCreateReceiptUsesTheSefazTotal(t *testing.T) {
	handlers, _, h, token := newReceiptServer(t)
	handlers.sefaz = stubFetcher{cents: 4550, ok: true}

	body := decodeReceipt(t, postReceipt(t, h, token, centauroKey))
	if body.Receipt.PointsAwarded != 55 {
		t.Errorf("points = %d, want 55 (10 + 45)", body.Receipt.PointsAwarded)
	}
	if body.Receipt.TotalCents == nil || *body.Receipt.TotalCents != 4550 {
		t.Errorf("total_cents = %v, want 4550", body.Receipt.TotalCents)
	}
}

func TestCreateReceiptDegradesWhenSefazFails(t *testing.T) {
	handlers, _, h, token := newReceiptServer(t)
	handlers.sefaz = stubFetcher{err: context.DeadlineExceeded}

	rec := postReceipt(t, h, token, centauroKey)
	if rec.Code != http.StatusCreated {
		t.Fatalf("failing sefaz = %d, want 201 (%s)", rec.Code, rec.Body.String())
	}
	body := decodeReceipt(t, rec)
	if body.Receipt.PointsAwarded != 10 || body.Receipt.TotalCents != nil {
		t.Errorf("receipt = %+v, want 10 points and no total", body.Receipt)
	}
}

func TestStoreMissionCompletesOnce(t *testing.T) {
	_, st, h, token := newReceiptServer(t)

	keys := []string{centauroKey, makeKey("2611", leituraCNPJ, 1), makeKey("2611", "44555666000181", 2)}
	for i, key := range keys {
		rec := postReceipt(t, h, token, key)
		if rec.Code != http.StatusCreated {
			t.Fatalf("receipt %d = %d, want 201 (%s)", i+1, rec.Code, rec.Body.String())
		}
		body := decodeReceipt(t, rec)

		switch i {
		case 0:
			for _, adv := range body.MissionsAdvanced {
				if adv.Completed {
					t.Fatalf("the first receipt completed %q", adv.Title)
				}
			}
		case 1:
			// Two distinct categories complete the category mission first.
			category := advancementFor(body.MissionsAdvanced, categoryMissionID)
			if category == nil || !category.Completed || category.PointsAwarded != 100 {
				t.Fatalf("category mission on the second receipt = %+v, want completed with 100", category)
			}
			if stores := advancementFor(body.MissionsAdvanced, storesMissionID); stores.Completed {
				t.Fatalf("stores mission completed too early: %+v", stores)
			}
		case 2:
			stores := advancementFor(body.MissionsAdvanced, storesMissionID)
			if stores == nil || !stores.Completed || stores.PointsAwarded != 150 || stores.Progress != 3 {
				t.Fatalf("stores mission on the third receipt = %+v, want completed with 150", stores)
			}
			// 30 from the receipts + 100 category + 150 stores.
			if body.Balance != 280 {
				t.Errorf("balance = %d, want 280", body.Balance)
			}
		}
	}

	// A fourth store advances nothing: the mission already paid.
	body := decodeReceipt(t, postReceipt(t, h, token, makeKey("2611", "11222333000181", 3)))
	if stores := advancementFor(body.MissionsAdvanced, storesMissionID); stores != nil {
		t.Errorf("stores mission advanced again: %+v", stores)
	}
	if body.Balance != 290 {
		t.Errorf("balance = %d, want 290", body.Balance)
	}
	if bonuses := countKind(st.ledger, "mission"); bonuses != 2 {
		t.Errorf("mission ledger entries = %d, want 2 (one per mission)", bonuses)
	}
}

func advancementFor(advanced []points.Advancement, missionID string) *points.Advancement {
	for i := range advanced {
		if advanced[i].MissionID == missionID {
			return &advanced[i]
		}
	}
	return nil
}

func countKind(rows []stubLedgerRow, kind string) int {
	n := 0
	for _, row := range rows {
		if row.Kind == kind {
			n++
		}
	}
	return n
}

func TestLedgerPaginatesWithACursor(t *testing.T) {
	_, st, h, token := newReceiptServer(t)
	visitorID := visitorIDOf(t, st)
	storeName := "Centauro"

	st.ledger = append(st.ledger,
		stubLedgerRow{ID: "99999999-9999-4999-8999-100000000001", VisitorID: visitorID, Kind: "receipt", Delta: 10, StoreName: &storeName, CreatedAt: receiptClock.Add(-3 * time.Hour)},
		stubLedgerRow{ID: "99999999-9999-4999-8999-100000000002", VisitorID: visitorID, Kind: "redeem", Delta: -300, CreatedAt: receiptClock.Add(-2 * time.Hour)},
		stubLedgerRow{ID: "99999999-9999-4999-8999-100000000003", VisitorID: visitorID, Kind: "receipt", Delta: 20, StoreName: &storeName, CreatedAt: receiptClock.Add(-time.Hour)},
	)

	first := doJSON(t, h, http.MethodGet, "/v1/me/ledger?limit=2", nil, token)
	if first.Code != http.StatusOK {
		t.Fatalf("ledger status = %d, want 200 (%s)", first.Code, first.Body.String())
	}
	var page ledgerResponse
	if err := json.Unmarshal(first.Body.Bytes(), &page); err != nil {
		t.Fatalf("decoding ledger page: %v", err)
	}
	if len(page.Entries) != 2 || page.NextCursor == nil {
		t.Fatalf("first page = %+v, want 2 entries and a cursor", page)
	}
	if page.Entries[0].Delta != 20 || page.Entries[0].Description != "Cupom em Centauro" {
		t.Errorf("newest entry = %+v, want the 20 seed receipt from Centauro", page.Entries[0])
	}
	if page.Entries[1].Description != "Resgate de prêmio" {
		t.Errorf("description = %q, want the pt-BR redeem copy", page.Entries[1].Description)
	}

	second := doJSON(t, h, http.MethodGet, "/v1/me/ledger?limit=2&cursor="+*page.NextCursor, nil, token)
	if second.Code != http.StatusOK {
		t.Fatalf("second page = %d, want 200 (%s)", second.Code, second.Body.String())
	}
	if err := json.Unmarshal(second.Body.Bytes(), &page); err != nil {
		t.Fatalf("decoding second page: %v", err)
	}
	if len(page.Entries) != 1 || page.Entries[0].Delta != 10 || page.NextCursor != nil {
		t.Errorf("second page = %+v, want the last entry and no cursor", page)
	}

	if rec := doJSON(t, h, http.MethodGet, "/v1/me/ledger?cursor=not-base64", nil, token); rec.Code != http.StatusUnprocessableEntity {
		t.Errorf("invalid cursor = %d, want 422 (%s)", rec.Code, rec.Body.String())
	}
	crafted := base64.RawURLEncoding.EncodeToString([]byte("2026-11-13T15:00:00Z|not-a-uuid"))
	if rec := doJSON(t, h, http.MethodGet, "/v1/me/ledger?cursor="+crafted, nil, token); rec.Code != http.StatusUnprocessableEntity {
		t.Errorf("crafted cursor = %d, want 422 (%s)", rec.Code, rec.Body.String())
	}
	if rec := doJSON(t, h, http.MethodGet, "/v1/me/ledger?limit=0", nil, token); rec.Code != http.StatusUnprocessableEntity {
		t.Errorf("invalid limit = %d, want 422 (%s)", rec.Code, rec.Body.String())
	}
}
