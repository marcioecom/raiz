package httpapi

import (
	"context"
	"encoding/json"
	"net/http"
	"testing"
	"time"

	"github.com/marcioecom/raiz/apps/api/internal/points"
	"github.com/marcioecom/raiz/apps/api/internal/store"
)

func newMissionsServer(t *testing.T) (*stubStore, http.Handler, string) {
	t.Helper()

	handlers, st, h := newTestServer(t, true)
	handlers.now = func() time.Time { return homeClock }

	season := store.Season{
		ID:       "22222222-2222-2222-2222-222222222201",
		Name:     "Safra 1 — Volta ao Capim",
		StartsAt: time.Date(2026, 11, 12, 0, 0, 0, 0, time.UTC),
		EndsAt:   time.Date(2027, 1, 9, 0, 0, 0, 0, time.UTC),
	}
	st.season = &season

	st.stores["11222333000181"] = store.StoreInfo{ID: "11111111-1111-1111-1111-111111111101", Name: "Casa do Pão", Category: "alimentacao"}
	st.stores["33444555000181"] = store.StoreInfo{ID: "11111111-1111-1111-1111-111111111103", Name: "Studio Aurora", Category: "moda"}
	st.stores[cinemaCNPJ] = store.StoreInfo{ID: "11111111-1111-1111-1111-111111111105", Name: "Cinema Lumière", Category: "entretenimento"}

	visitor, err := st.CreateVisitor(context.Background(), "hash", mustEncrypt(t, handlers, "63999990021"), "Ana")
	if err != nil {
		t.Fatalf("seeding visitor: %v", err)
	}
	return st, h, mustSign(t, "test-jwt-secret-long-enough", visitor.ID)
}

// seedReceipt is the history the mission rules read.
func seedReceipt(st *stubStore, visitorID, storeID string, at time.Time) {
	st.receipts = append(st.receipts, stubReceipt{
		VisitorID: visitorID,
		StoreID:   &storeID,
		IssuedAt:  at,
	})
}

func TestGetMissionsComputesProgressAndOrdersCompletedLast(t *testing.T) {
	st, h, token := newMissionsServer(t)
	visitorID := visitorIDOf(t, st)

	rhythmID := "33333333-3333-3333-3333-333333333303"
	st.missions = []store.MissionState{
		{Code: "tres_lojas", Mission: points.Mission{ID: storesMissionID, Title: "Compre em 3 lojas diferentes em 7 dias", RuleType: points.RuleStores, Target: 3, RewardPoints: 150}},
		{Code: "alimentacao_e_moda", Mission: points.Mission{ID: categoryMissionID, Title: "Alimentação + moda na mesma semana", RuleType: points.RuleCategory, Target: 2, RewardPoints: 100, Categories: []string{"alimentacao", "moda"}}},
		{Code: "ritmo_4_semanas", Mission: points.Mission{ID: rhythmID, Title: "Ritmo: 4 semanas seguidas no Capim", RuleType: "rhythm", Target: 4, RewardPoints: 200}},
	}
	st.counters[rhythmID] = 4
	st.completed[rhythmID] = true

	// alimentação + moda in the current week, plus a third store.
	seedReceipt(st, visitorID, "11111111-1111-1111-1111-111111111101", homeClock.Add(-2*time.Hour))
	seedReceipt(st, visitorID, "11111111-1111-1111-1111-111111111103", homeClock.Add(-time.Hour))
	seedReceipt(st, visitorID, "11111111-1111-1111-1111-111111111105", homeClock.Add(-30*time.Minute))

	rec := doJSON(t, h, http.MethodGet, "/v1/missions", nil, token)
	if rec.Code != http.StatusOK {
		t.Fatalf("missions status = %d, want 200 (%s)", rec.Code, rec.Body.String())
	}

	var body missionsResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("decoding missions response %q: %v", rec.Body.String(), err)
	}
	if body.Season == nil || body.Season.StartsAt != "2026-11-12" || body.Season.EndsAt != "2027-01-09" {
		t.Fatalf("season = %+v, want the active safra window", body.Season)
	}
	if len(body.Missions) != 3 {
		t.Fatalf("missions = %+v, want 3", body.Missions)
	}

	// Progress comes from the rules: 3 stores and the two named categories.
	if body.Missions[0].Code != "tres_lojas" || body.Missions[0].Progress != 3 {
		t.Errorf("first mission = %+v, want tres_lojas with progress 3", body.Missions[0])
	}
	if body.Missions[1].Code != "alimentacao_e_moda" || body.Missions[1].Progress != 2 {
		t.Errorf("second mission = %+v, want alimentacao_e_moda with progress 2", body.Missions[1])
	}
	if body.Missions[2].Code != "ritmo_4_semanas" || body.Missions[2].CompletedAt == nil {
		t.Errorf("last mission = %+v, want the completed rhythm mission", body.Missions[2])
	}
	for _, mission := range body.Missions[:2] {
		if mission.CompletedAt != nil {
			t.Errorf("%s completed_at = %v, want null: only a scan completes a mission", mission.Code, mission.CompletedAt)
		}
	}
}

func TestRhythmMissionCountsConsecutiveWeeksAndPaysOnce(t *testing.T) {
	_, st, h, token := newReceiptServer(t)

	rhythmID := "33333333-3333-3333-3333-333333333303"
	rhythmTitle := "Ritmo: 4 semanas seguidas no Capim"
	st.missions = append(st.missions, store.MissionState{
		Code: "ritmo_4_semanas",
		Mission: points.Mission{
			ID: rhythmID, Title: rhythmTitle, RuleType: points.RuleRhythm,
			Target: 4, RewardPoints: 200,
		},
	})

	// Three consecutive ISO weeks ending on the current one (2026-11-13).
	monday := time.Date(2026, 11, 9, 0, 0, 0, 0, time.UTC)
	st.weeks = []time.Time{monday, monday.AddDate(0, 0, -7), monday.AddDate(0, 0, -14)}

	rec := doJSON(t, h, http.MethodGet, "/v1/missions", nil, token)
	if rec.Code != http.StatusOK {
		t.Fatalf("missions status = %d, want 200 (%s)", rec.Code, rec.Body.String())
	}
	var missions missionsResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &missions); err != nil {
		t.Fatalf("decoding missions: %v", err)
	}
	var rhythm *missionView
	for i := range missions.Missions {
		if missions.Missions[i].Code == "ritmo_4_semanas" {
			rhythm = &missions.Missions[i]
		}
	}
	if rhythm == nil || rhythm.Progress != 3 || rhythm.CompletedAt != nil {
		t.Fatalf("rhythm = %+v, want 3 of 4 and still open", rhythm)
	}

	// The fourth week completes the mission on the next scan.
	st.weeks = append(st.weeks, monday.AddDate(0, 0, -21))
	body := decodeReceipt(t, postReceipt(t, h, token, centauroKey))

	completed := advancementFor(body.MissionsAdvanced, rhythmID)
	if completed == nil || !completed.Completed || completed.Progress != 4 || completed.PointsAwarded != 200 {
		t.Fatalf("rhythm on the fourth week = %+v, want completed with 200", completed)
	}
	if body.Balance != 210 {
		t.Errorf("balance = %d, want 210 (10 from the receipt + 200 from rhythm)", body.Balance)
	}

	// Another receipt in the same week never pays the rhythm bonus again.
	again := decodeReceipt(t, postReceipt(t, h, token, makeKey("2611", leituraCNPJ, 1)))
	if advancement := advancementFor(again.MissionsAdvanced, rhythmID); advancement != nil {
		t.Errorf("rhythm advanced again: %+v", advancement)
	}
	rhythmEntries := 0
	for _, row := range st.ledger {
		if row.Kind == "mission" && row.MissionTitle != nil && *row.MissionTitle == rhythmTitle {
			rhythmEntries++
		}
	}
	if rhythmEntries != 1 {
		t.Errorf("rhythm ledger entries = %d, want 1", rhythmEntries)
	}
}

func TestGetMissionsCountsOnlyTheNamedCategories(t *testing.T) {
	st, h, token := newMissionsServer(t)
	visitorID := visitorIDOf(t, st)

	st.missions = []store.MissionState{
		{Code: "alimentacao_e_moda", Mission: points.Mission{ID: categoryMissionID, Title: "Alimentação + moda na mesma semana", RuleType: points.RuleCategory, Target: 2, RewardPoints: 100, Categories: []string{"alimentacao", "moda"}}},
	}

	// Cinema (entretenimento) is not one of the mission categories.
	seedReceipt(st, visitorID, "11111111-1111-1111-1111-111111111105", homeClock.Add(-2*time.Hour))
	// Studio Aurora is moda: the only one that counts.
	seedReceipt(st, visitorID, "11111111-1111-1111-1111-111111111103", homeClock.Add(-time.Hour))

	rec := doJSON(t, h, http.MethodGet, "/v1/missions", nil, token)
	if rec.Code != http.StatusOK {
		t.Fatalf("missions status = %d, want 200 (%s)", rec.Code, rec.Body.String())
	}

	var body missionsResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("decoding missions response: %v", err)
	}
	if len(body.Missions) != 1 || body.Missions[0].Progress != 1 {
		t.Fatalf("missions = %+v, want only moda counted (progress 1)", body.Missions)
	}
}
