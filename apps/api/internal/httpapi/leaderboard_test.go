package httpapi

import (
	"context"
	"encoding/json"
	"net/http"
	"testing"
	"time"

	"github.com/marcioecom/raiz/apps/api/internal/store"
)

func (s *stubStore) ActiveSeason(context.Context) (store.Season, error) {
	if s.season == nil {
		return store.Season{}, store.ErrNotFound
	}
	return *s.season, nil
}

func (s *stubStore) Leaderboard(_ context.Context, _, _ time.Time, limit int) ([]store.LeaderboardRow, error) {
	return s.board[:min(len(s.board), limit)], nil
}

func (s *stubStore) LeaderboardStanding(context.Context, time.Time, time.Time, string) (int, int, error) {
	return s.mePoints, s.mePos, nil
}

func TestAbbreviateName(t *testing.T) {
	cases := map[string]string{
		"Márcio Júnior":           "M. J.",
		"Ana de Souza Lima":       "A. S. L.",
		"ana":                     "A.",
		"João dos Santos e Silva": "J. S. S.",
		"":                        "",
	}
	for name, want := range cases {
		if got := abbreviateName(name); got != want {
			t.Errorf("abbreviateName(%q) = %q, want %q", name, got, want)
		}
	}
}

func TestLeaderboardShowsTheTopAndMyStanding(t *testing.T) {
	handlers, st, h := newTestServer(t, true)
	handlers.now = func() time.Time { return homeClock }

	season := store.Season{
		ID:       "22222222-2222-2222-2222-222222222201",
		Name:     "Safra 1 — Volta ao Capim",
		StartsAt: time.Date(2026, 11, 12, 0, 0, 0, 0, time.UTC),
		EndsAt:   time.Date(2027, 1, 9, 0, 0, 0, 0, time.UTC),
	}
	st.season = &season

	visitor, err := st.CreateVisitor(context.Background(), "hash", mustEncrypt(t, handlers, "63999990022"), "Márcio Júnior")
	if err != nil {
		t.Fatalf("seeding visitor: %v", err)
	}

	st.board = []store.LeaderboardRow{
		{VisitorID: "00000000-0000-4000-8000-000000000901", Name: "Ana Beatriz", Points: 900},
		{VisitorID: "00000000-0000-4000-8000-000000000902", Name: "Carlos de Souza", Points: 500},
		{VisitorID: "00000000-0000-4000-8000-000000000903", Name: "Bia Nunes", Points: 500},
	}
	// The visitor is outside the top: the payload still carries the position.
	st.mePoints = 120
	st.mePos = 7

	token := mustSign(t, "test-jwt-secret-long-enough", visitor.ID)
	rec := doJSON(t, h, http.MethodGet, "/v1/leaderboard?limit=2", nil, token)
	if rec.Code != http.StatusOK {
		t.Fatalf("leaderboard status = %d, want 200 (%s)", rec.Code, rec.Body.String())
	}

	var body leaderboardResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("decoding leaderboard response %q: %v", rec.Body.String(), err)
	}
	if body.Season == nil || body.Season.Name != "Safra 1 — Volta ao Capim" {
		t.Fatalf("season = %+v, want the active safra", body.Season)
	}
	if len(body.Entries) != 2 {
		t.Fatalf("entries = %+v, want the 2 of the limit", body.Entries)
	}
	if body.Entries[0].DisplayName != "A. B." || body.Entries[0].Points != 900 || body.Entries[0].Position != 1 {
		t.Errorf("first entry = %+v, want A. B. with 900 at position 1", body.Entries[0])
	}
	if body.Entries[1].DisplayName != "C. S." || body.Entries[1].Position != 2 {
		t.Errorf("second entry = %+v, want C. S. at position 2", body.Entries[1])
	}
	if body.Me == nil || body.Me.Position != 7 || body.Me.Points != 120 {
		t.Errorf("me = %+v, want position 7 with 120 points", body.Me)
	}
	for _, entry := range body.Entries {
		if entry.IsMe {
			t.Errorf("%s is_me = true, want false: the visitor is outside the top", entry.DisplayName)
		}
	}

	// Ties share the position of the first one with those points.
	full := doJSON(t, h, http.MethodGet, "/v1/leaderboard", nil, token)
	if full.Code != http.StatusOK {
		t.Fatalf("leaderboard status = %d, want 200 (%s)", full.Code, full.Body.String())
	}
	if err := json.Unmarshal(full.Body.Bytes(), &body); err != nil {
		t.Fatalf("decoding leaderboard response: %v", err)
	}
	if len(body.Entries) != 3 || body.Entries[2].Position != 2 {
		t.Errorf("entries = %+v, want the tie at position 2", body.Entries)
	}
}

func TestLeaderboardRejectsInvalidLimit(t *testing.T) {
	_, st, h := newTestServer(t, true)
	visitor, err := st.CreateVisitor(context.Background(), "hash", "enc", "Ana")
	if err != nil {
		t.Fatalf("seeding visitor: %v", err)
	}

	token := mustSign(t, "test-jwt-secret-long-enough", visitor.ID)
	for _, limit := range []string{"0", "-1", "abc"} {
		rec := doJSON(t, h, http.MethodGet, "/v1/leaderboard?limit="+limit, nil, token)
		if rec.Code != http.StatusUnprocessableEntity || errorCode(t, rec) != "invalid_limit" {
			t.Errorf("limit %q = %d %s, want 422 invalid_limit", limit, rec.Code, rec.Body.String())
		}
	}
}

func TestLeaderboardWithoutSeason(t *testing.T) {
	_, st, h := newTestServer(t, true)
	visitor, err := st.CreateVisitor(context.Background(), "hash", "enc", "Ana")
	if err != nil {
		t.Fatalf("seeding visitor: %v", err)
	}

	token := mustSign(t, "test-jwt-secret-long-enough", visitor.ID)
	rec := doJSON(t, h, http.MethodGet, "/v1/leaderboard", nil, token)
	if rec.Code != http.StatusOK {
		t.Fatalf("leaderboard status = %d, want 200 (%s)", rec.Code, rec.Body.String())
	}
	var body leaderboardResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("decoding leaderboard response: %v", err)
	}
	if body.Season != nil || len(body.Entries) != 0 || body.Me != nil {
		t.Errorf("body = %+v, want no season, no entries and no standing", body)
	}
}
