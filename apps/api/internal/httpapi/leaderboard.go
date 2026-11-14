package httpapi

import (
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/marcioecom/raiz/apps/api/internal/store"
)

const (
	leaderboardDefaultLimit = 10
	leaderboardMaxLimit     = 50
)

type leaderboardEntry struct {
	Position    int    `json:"position"`
	DisplayName string `json:"display_name"`
	Points      int    `json:"points"`
	IsMe        bool   `json:"is_me"`
}

type leaderboardMe struct {
	Position int `json:"position"`
	Points   int `json:"points"`
}

type leaderboardResponse struct {
	Season  *seasonView        `json:"season"`
	Entries []leaderboardEntry `json:"entries"`
	Me      *leaderboardMe     `json:"me"`
}

// getLeaderboard ranks the safra by the ledger sum. Nobody sees another
// visitor full name: the entries carry an abbreviation.
func (a *api) getLeaderboard(w http.ResponseWriter, r *http.Request) {
	limit := leaderboardDefaultLimit
	if raw := r.URL.Query().Get("limit"); raw != "" {
		n, err := strconv.Atoi(raw)
		if err != nil || n <= 0 {
			writeError(w, http.StatusUnprocessableEntity, "invalid_limit",
				"limit must be a positive integer", nil)
			return
		}
		limit = min(n, leaderboardMaxLimit)
	}

	ctx := r.Context()
	season, err := a.store.ActiveSeason(ctx)
	if errors.Is(err, store.ErrNotFound) {
		writeJSON(w, http.StatusOK, leaderboardResponse{Entries: []leaderboardEntry{}})
		return
	}
	if err != nil {
		a.log.Error("leaderboard: loading season", "err", err)
		writeError(w, http.StatusInternalServerError, "internal_error", "internal error", nil)
		return
	}

	// The safra ends on a calendar day: the window includes that whole day.
	from, to := season.StartsAt, season.EndsAt.AddDate(0, 0, 1)

	rows, err := a.store.Leaderboard(ctx, from, to, limit)
	if err != nil {
		a.log.Error("leaderboard: loading entries", "err", err)
		writeError(w, http.StatusInternalServerError, "internal_error", "internal error", nil)
		return
	}

	visitor := visitorFrom(ctx)
	mePoints, mePosition, err := a.store.LeaderboardStanding(ctx, from, to, visitor.ID)
	if err != nil {
		a.log.Error("leaderboard: loading standing", "err", err)
		writeError(w, http.StatusInternalServerError, "internal_error", "internal error", nil)
		return
	}

	entries := make([]leaderboardEntry, 0, len(rows))
	position := 0
	for i, row := range rows {
		// Ties share the position of the first visitor with those points.
		if i == 0 || row.Points < rows[i-1].Points {
			position = i + 1
		}
		entries = append(entries, leaderboardEntry{
			Position:    position,
			DisplayName: abbreviateName(row.Name),
			Points:      row.Points,
			IsMe:        row.VisitorID == visitor.ID,
		})
	}

	writeJSON(w, http.StatusOK, leaderboardResponse{
		Season:  newSeasonView(season),
		Entries: entries,
		Me:      &leaderboardMe{Position: mePosition, Points: mePoints},
	})
}

// Particles are not initials: "Márcio de Souza" reads as "M. S.".
var nameParticles = map[string]bool{
	"de": true, "da": true, "do": true, "das": true, "dos": true, "e": true,
}

// abbreviateName turns "Márcio Júnior" into "M. J.".
func abbreviateName(name string) string {
	initials := make([]string, 0, 4)
	for _, field := range strings.Fields(name) {
		if nameParticles[strings.ToLower(field)] {
			continue
		}
		initial := []rune(field)[0]
		initials = append(initials, strings.ToUpper(string(initial))+".")
	}
	return strings.Join(initials, " ")
}
