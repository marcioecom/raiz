package httpapi

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/marcioecom/raiz/apps/api/internal/auth"
	"github.com/marcioecom/raiz/apps/api/internal/config"
	"github.com/marcioecom/raiz/apps/api/internal/store"
)

// stubStore keeps the handler tests free of Postgres.
type stubStore struct {
	visitors map[string]store.Visitor // by phone hash
	otps     []stubOTP
	stats    store.MeStats
	weeks    []time.Time
	seq      int

	stores    map[string]store.StoreInfo // by CNPJ
	receipts  []stubReceipt
	missions  []store.MissionState
	counters  map[string]int  // by mission id
	completed map[string]bool // by mission id
	ledger    []stubLedgerRow

	season   *store.Season
	events   []store.Event
	offers   []store.Offer
	rewards  []store.RewardOption
	board    []store.LeaderboardRow
	mePoints int
	mePos    int
}

// stubOTP adds the lookup key the table keeps in its own column.
type stubOTP struct {
	store.OTP
	phoneHash string
}

func newStubStore() *stubStore {
	return &stubStore{
		visitors:  map[string]store.Visitor{},
		stores:    map[string]store.StoreInfo{},
		counters:  map[string]int{},
		completed: map[string]bool{},
	}
}

func (s *stubStore) VisitorByPhoneHash(_ context.Context, phoneHash string) (store.Visitor, error) {
	if v, ok := s.visitors[phoneHash]; ok {
		return v, nil
	}
	return store.Visitor{}, store.ErrNotFound
}

func (s *stubStore) VisitorByID(_ context.Context, id string) (store.Visitor, error) {
	for _, v := range s.visitors {
		if v.ID == id {
			return v, nil
		}
	}
	return store.Visitor{}, store.ErrNotFound
}

func (s *stubStore) CreateVisitor(_ context.Context, phoneHash, phoneEnc, name string) (store.Visitor, error) {
	s.seq++
	v := store.Visitor{
		ID:        fmt.Sprintf("00000000-0000-4000-8000-%012d", s.seq),
		Name:      name,
		PhoneEnc:  phoneEnc,
		CreatedAt: time.Now().UTC().Truncate(time.Second),
	}
	s.visitors[phoneHash] = v
	return v, nil
}

func (s *stubStore) SoftDeleteVisitor(_ context.Context, id string) error {
	for hash, v := range s.visitors {
		if v.ID == id {
			now := time.Now().UTC()
			v.DeletedAt = &now
			s.visitors[hash] = v
			return nil
		}
	}
	return store.ErrNotFound
}

func (s *stubStore) CreateOTP(_ context.Context, phoneHash, codeHash string, expiresAt time.Time) error {
	now := time.Now().UTC()
	for i := range s.otps {
		if s.otps[i].phoneHash == phoneHash && s.otps[i].ConsumedAt == nil {
			s.otps[i].ConsumedAt = &now
		}
	}
	s.seq++
	s.otps = append(s.otps, stubOTP{
		OTP: store.OTP{
			ID:        fmt.Sprintf("00000000-0000-4000-8000-%012d", s.seq),
			CodeHash:  codeHash,
			ExpiresAt: expiresAt,
		},
		phoneHash: phoneHash,
	})
	return nil
}

func (s *stubStore) LatestOTP(_ context.Context, phoneHash string) (store.OTP, error) {
	for i := len(s.otps) - 1; i >= 0; i-- {
		if s.otps[i].phoneHash == phoneHash {
			return s.otps[i].OTP, nil
		}
	}
	return store.OTP{}, store.ErrNotFound
}

func (s *stubStore) IncrementOTPAttempts(_ context.Context, id string) error {
	for i := range s.otps {
		if s.otps[i].ID == id {
			s.otps[i].Attempts++
			return nil
		}
	}
	return store.ErrNotFound
}

func (s *stubStore) ConsumeOTP(_ context.Context, id string) error {
	now := time.Now().UTC()
	for i := range s.otps {
		if s.otps[i].ID == id {
			if s.otps[i].ConsumedAt != nil {
				return store.ErrNotFound
			}
			s.otps[i].ConsumedAt = &now
			return nil
		}
	}
	return store.ErrNotFound
}

func (s *stubStore) MeStats(_ context.Context, _ string) (store.MeStats, error) {
	return s.stats, nil
}

func (s *stubStore) ReceiptWeeks(_ context.Context, _ string) ([]time.Time, error) {
	return s.weeks, nil
}

const testPIIKey = "test-pii-key-with-32-characters!!"

func newTestServer(t *testing.T, demo bool) (*api, *stubStore, http.Handler) {
	t.Helper()

	cfg := config.Config{
		Env:       "test",
		DemoMode:  demo,
		JWTSecret: "test-jwt-secret-long-enough",
		PIIKey:    testPIIKey,
	}
	st := newStubStore()
	handlers, err := newAPI(cfg, st, slog.New(slog.NewTextHandler(io.Discard, nil)))
	if err != nil {
		t.Fatalf("newAPI() error: %v", err)
	}

	r := chi.NewRouter()
	r.Route("/v1", handlers.mount)
	return handlers, st, r
}

func doJSON(t *testing.T, h http.Handler, method, path string, body any, token string) *httptest.ResponseRecorder {
	t.Helper()

	var reader io.Reader
	if body != nil {
		payload, err := json.Marshal(body)
		if err != nil {
			t.Fatalf("marshalling body: %v", err)
		}
		reader = bytes.NewReader(payload)
	}

	req := httptest.NewRequest(method, path, reader)
	req.Header.Set("Content-Type", "application/json")
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}

	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	return rec
}

func errorCode(t *testing.T, rec *httptest.ResponseRecorder) string {
	t.Helper()

	var envelope errorEnvelope
	if err := json.Unmarshal(rec.Body.Bytes(), &envelope); err != nil {
		t.Fatalf("decoding error envelope %q: %v", rec.Body.String(), err)
	}
	return envelope.Error.Code
}

func TestOTPAndVerifyDemoFlow(t *testing.T) {
	_, _, h := newTestServer(t, true)
	phone := "(63) 99999-0001"

	otp := doJSON(t, h, http.MethodPost, "/v1/auth/otp", map[string]string{"phone": phone}, "")
	if otp.Code != http.StatusAccepted {
		t.Fatalf("otp status = %d, want 202 (%s)", otp.Code, otp.Body.String())
	}
	var otpBody struct {
		Sent      bool    `json:"sent"`
		ExpiresIn int     `json:"expires_in"`
		DemoCode  *string `json:"demo_code"`
	}
	if err := json.Unmarshal(otp.Body.Bytes(), &otpBody); err != nil {
		t.Fatalf("decoding otp response: %v", err)
	}
	if !otpBody.Sent || otpBody.ExpiresIn != 300 {
		t.Errorf("otp response = %+v, want sent and expires_in 300", otpBody)
	}
	if otpBody.DemoCode == nil || *otpBody.DemoCode != "000000" {
		t.Errorf("demo_code = %v, want 000000", otpBody.DemoCode)
	}

	// First access without a name is refused: the handler must ask for it.
	missingName := doJSON(t, h, http.MethodPost, "/v1/auth/verify",
		map[string]string{"phone": phone, "code": "000000"}, "")
	if missingName.Code != http.StatusUnprocessableEntity || errorCode(t, missingName) != "name_required" {
		t.Fatalf("verify without name = %d %s, want 422 name_required", missingName.Code, missingName.Body.String())
	}

	verified := doJSON(t, h, http.MethodPost, "/v1/auth/verify",
		map[string]string{"phone": phone, "code": "000000", "name": "Maria"}, "")
	if verified.Code != http.StatusOK {
		t.Fatalf("verify status = %d, want 200 (%s)", verified.Code, verified.Body.String())
	}

	var session verifyResponse
	if err := json.Unmarshal(verified.Body.Bytes(), &session); err != nil {
		t.Fatalf("decoding verify response: %v", err)
	}
	if session.Token == "" || !session.IsNew {
		t.Fatalf("verify response = %+v, want a token and is_new", session)
	}
	if session.Visitor.Name != "Maria" {
		t.Errorf("visitor name = %q, want Maria", session.Visitor.Name)
	}
	if session.Visitor.PhoneMasked != "(63) 9****-0001" {
		t.Errorf("phone_masked = %q, want (63) 9****-0001", session.Visitor.PhoneMasked)
	}

	me := doJSON(t, h, http.MethodGet, "/v1/me", nil, session.Token)
	if me.Code != http.StatusOK {
		t.Fatalf("me status = %d, want 200 (%s)", me.Code, me.Body.String())
	}
	var profile meResponse
	if err := json.Unmarshal(me.Body.Bytes(), &profile); err != nil {
		t.Fatalf("decoding me response: %v", err)
	}
	if profile.Tier != tierSemente || profile.NextTierAt == nil || *profile.NextTierAt != raizAt {
		t.Errorf("tier = %q next_tier_at = %v, want semente and %d", profile.Tier, profile.NextTierAt, raizAt)
	}
	if profile.Balance != 0 || profile.ReceiptsCount != 0 || profile.StreakWeeks != 0 || profile.FirstVisitAt != nil {
		t.Errorf("me response = %+v, want empty counters", profile)
	}

	// Second access reuses the visitor and does not require the name again.
	again := doJSON(t, h, http.MethodPost, "/v1/auth/verify",
		map[string]string{"phone": phone, "code": "000000"}, "")
	if again.Code != http.StatusOK {
		t.Fatalf("second verify status = %d, want 200 (%s)", again.Code, again.Body.String())
	}
	var second verifyResponse
	if err := json.Unmarshal(again.Body.Bytes(), &second); err != nil {
		t.Fatalf("decoding second verify: %v", err)
	}
	if second.IsNew || second.Visitor.ID != session.Visitor.ID {
		t.Errorf("second verify is_new = %v id = %q, want false and %q", second.IsNew, second.Visitor.ID, session.Visitor.ID)
	}

	deleted := doJSON(t, h, http.MethodDelete, "/v1/me", nil, session.Token)
	if deleted.Code != http.StatusNoContent {
		t.Fatalf("delete status = %d, want 204 (%s)", deleted.Code, deleted.Body.String())
	}
	if after := doJSON(t, h, http.MethodGet, "/v1/me", nil, session.Token); after.Code != http.StatusUnauthorized {
		t.Fatalf("me after delete = %d, want 401 (%s)", after.Code, after.Body.String())
	}
}

func TestOTPRejectsInvalidPhone(t *testing.T) {
	_, _, h := newTestServer(t, true)

	for _, phone := range []string{"", "123", "123456789012"} {
		rec := doJSON(t, h, http.MethodPost, "/v1/auth/otp", map[string]string{"phone": phone}, "")
		if rec.Code != http.StatusUnprocessableEntity || errorCode(t, rec) != "invalid_phone" {
			t.Errorf("otp phone %q = %d %s, want 422 invalid_phone", phone, rec.Code, rec.Body.String())
		}
	}
}

func TestVerifyRejectsWrongDemoCode(t *testing.T) {
	_, _, h := newTestServer(t, true)

	rec := doJSON(t, h, http.MethodPost, "/v1/auth/verify",
		map[string]string{"phone": "63999990001", "code": "123456", "name": "Maria"}, "")
	if rec.Code != http.StatusUnauthorized || errorCode(t, rec) != "invalid_code" {
		t.Fatalf("verify = %d %s, want 401 invalid_code", rec.Code, rec.Body.String())
	}
}

func TestVerifyOutsideDemoMode(t *testing.T) {
	handlers, st, h := newTestServer(t, false)
	phone := "63999990002"
	phoneHash := handlers.vault.Hash(phone)

	seedOTP := func(code string, expiresAt time.Time) {
		st.otps = nil
		if err := st.CreateOTP(context.Background(), phoneHash, handlers.vault.Hash(code), expiresAt); err != nil {
			t.Fatalf("seeding otp: %v", err)
		}
	}
	verify := func(code string) *httptest.ResponseRecorder {
		return doJSON(t, h, http.MethodPost, "/v1/auth/verify",
			map[string]string{"phone": phone, "code": code, "name": "Joao"}, "")
	}

	seedOTP("424242", time.Now().UTC().Add(otpTTL))
	if rec := verify("424242"); rec.Code != http.StatusOK {
		t.Fatalf("verify valid code = %d, want 200 (%s)", rec.Code, rec.Body.String())
	}
	// Consumed codes cannot be reused.
	if rec := verify("424242"); rec.Code != http.StatusUnauthorized {
		t.Fatalf("verify reused code = %d, want 401 (%s)", rec.Code, rec.Body.String())
	}

	// Expired codes are refused.
	seedOTP("424242", time.Now().UTC().Add(-time.Minute))
	if rec := verify("424242"); rec.Code != http.StatusUnauthorized {
		t.Fatalf("verify expired code = %d, want 401 (%s)", rec.Code, rec.Body.String())
	}

	// Five wrong tries burn the code even if the last one is right.
	seedOTP("424242", time.Now().UTC().Add(otpTTL))
	for i := 0; i < otpMaxTries; i++ {
		if rec := verify("000001"); rec.Code != http.StatusUnauthorized {
			t.Fatalf("wrong try %d = %d, want 401", i+1, rec.Code)
		}
	}
	if rec := verify("424242"); rec.Code != http.StatusUnauthorized || errorCode(t, rec) != "invalid_code" {
		t.Fatalf("verify after %d tries = %d %s, want 401 invalid_code", otpMaxTries, rec.Code, rec.Body.String())
	}
}

func TestRequireAuthRejectsBadTokens(t *testing.T) {
	_, _, h := newTestServer(t, true)

	cases := map[string]string{
		"no token":          "",
		"garbage":           "definitely-not-a-token",
		"foreign signature": mustSign(t, "another-secret-long-enough", "8f14e45f-ceea-4b0b-9f0e-1b2c3d4e5f60"),
		"unknown visitor":   mustSign(t, "test-jwt-secret-long-enough", "8f14e45f-ceea-4b0b-9f0e-1b2c3d4e5f60"),
	}
	for name, token := range cases {
		rec := doJSON(t, h, http.MethodGet, "/v1/me", nil, token)
		if rec.Code != http.StatusUnauthorized || errorCode(t, rec) != "unauthorized" {
			t.Errorf("%s = %d %s, want 401 unauthorized", name, rec.Code, rec.Body.String())
		}
	}
}

func mustSign(t *testing.T, secret, subject string) string {
	t.Helper()
	token, _, err := auth.NewSigner(secret).Issue(subject)
	if err != nil {
		t.Fatalf("issuing token: %v", err)
	}
	return token
}

func TestGetMeReportsBalanceTierAndStreak(t *testing.T) {
	handlers, st, h := newTestServer(t, true)

	now := time.Now().UTC()
	firstVisit := now.AddDate(0, -2, 0)
	st.stats = store.MeStats{Balance: 230, Earned: 700, ReceiptsCount: 4, FirstVisitAt: &firstVisit}
	st.weeks = []time.Time{now, now.AddDate(0, 0, -7)}

	visitor, err := st.CreateVisitor(context.Background(), "hash", mustEncrypt(t, handlers, "63999990003"), "Ana")
	if err != nil {
		t.Fatalf("seeding visitor: %v", err)
	}

	rec := doJSON(t, h, http.MethodGet, "/v1/me", nil, mustSign(t, "test-jwt-secret-long-enough", visitor.ID))
	if rec.Code != http.StatusOK {
		t.Fatalf("me status = %d, want 200 (%s)", rec.Code, rec.Body.String())
	}

	var profile meResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &profile); err != nil {
		t.Fatalf("decoding me response: %v", err)
	}
	if profile.Balance != 230 || profile.ReceiptsCount != 4 || profile.StreakWeeks != 2 {
		t.Errorf("me = %+v, want balance 230, 4 receipts and a 2 week streak", profile)
	}
	if profile.Tier != tierRaiz || profile.NextTierAt == nil || *profile.NextTierAt != douradoAt-700 {
		t.Errorf("tier = %q next_tier_at = %v, want raiz and %d", profile.Tier, profile.NextTierAt, douradoAt-700)
	}
	if profile.FirstVisitAt == nil || !profile.FirstVisitAt.Equal(firstVisit) {
		t.Errorf("first_visit_at = %v, want %s", profile.FirstVisitAt, firstVisit)
	}
}

func mustEncrypt(t *testing.T, handlers *api, phone string) string {
	t.Helper()
	enc, err := handlers.vault.Encrypt(phone)
	if err != nil {
		t.Fatalf("encrypting phone: %v", err)
	}
	return enc
}

func TestTierFor(t *testing.T) {
	cases := []struct {
		earned   int
		tier     string
		nextTier *int
	}{
		{0, tierSemente, intPtr(500)},
		{499, tierSemente, intPtr(1)},
		{500, tierRaiz, intPtr(1500)},
		{1999, tierRaiz, intPtr(1)},
		{2000, tierDourado, nil},
	}
	for _, tc := range cases {
		tier, next := tierFor(tc.earned)
		if tier != tc.tier {
			t.Errorf("tierFor(%d) tier = %q, want %q", tc.earned, tier, tc.tier)
		}
		if tc.nextTier == nil {
			if next != nil {
				t.Errorf("tierFor(%d) next = %d, want nil", tc.earned, *next)
			}
			continue
		}
		if next == nil || *next != *tc.nextTier {
			t.Errorf("tierFor(%d) next = %v, want %d", tc.earned, next, *tc.nextTier)
		}
	}
}

func TestDecodeJSONRejectsMalformedBody(t *testing.T) {
	_, _, h := newTestServer(t, true)

	req := httptest.NewRequest(http.MethodPost, "/v1/auth/otp", strings.NewReader("{"))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnprocessableEntity || errorCode(t, rec) != "invalid_body" {
		t.Fatalf("malformed body = %d %s, want 422 invalid_body", rec.Code, rec.Body.String())
	}
}
