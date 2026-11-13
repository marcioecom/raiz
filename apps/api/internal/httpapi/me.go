package httpapi

import (
	"errors"
	"net/http"
	"time"

	"github.com/marcioecom/raiz/apps/api/internal/store"
)

// Tier thresholds over the 12-month window, per the business rules.
const (
	tierSemente = "semente"
	tierRaiz    = "raiz"
	tierDourado = "dourado"

	raizAt    = 500
	douradoAt = 2000
)

type meResponse struct {
	Visitor       visitorResponse `json:"visitor"`
	Balance       int             `json:"balance"`
	Tier          string          `json:"tier"`
	NextTierAt    *int            `json:"next_tier_at"`
	StreakWeeks   int             `json:"streak_weeks"`
	ReceiptsCount int             `json:"receipts_count"`
	FirstVisitAt  *time.Time      `json:"first_visit_at"`
}

func (a *api) getMe(w http.ResponseWriter, r *http.Request) {
	visitor := visitorFrom(r.Context())

	stats, err := a.store.MeStats(r.Context(), visitor.ID)
	if err != nil {
		a.log.Error("me: loading stats", "err", err)
		writeError(w, http.StatusInternalServerError, "internal_error", "internal error", nil)
		return
	}

	weeks, err := a.store.ReceiptWeeks(r.Context(), visitor.ID)
	if err != nil {
		a.log.Error("me: loading receipt weeks", "err", err)
		writeError(w, http.StatusInternalServerError, "internal_error", "internal error", nil)
		return
	}

	tier, nextTierAt := tierFor(stats.Earned)

	writeJSON(w, http.StatusOK, meResponse{
		Visitor:       a.visitorView(visitor),
		Balance:       stats.Balance,
		Tier:          tier,
		NextTierAt:    nextTierAt,
		StreakWeeks:   store.StreakWeeks(weeks, time.Now().UTC()),
		ReceiptsCount: stats.ReceiptsCount,
		FirstVisitAt:  stats.FirstVisitAt,
	})
}

func (a *api) deleteMe(w http.ResponseWriter, r *http.Request) {
	visitor := visitorFrom(r.Context())

	if err := a.store.SoftDeleteVisitor(r.Context(), visitor.ID); err != nil {
		if errors.Is(err, store.ErrNotFound) {
			writeError(w, http.StatusUnauthorized, "unauthorized", "visitor not found", nil)
			return
		}
		a.log.Error("me: soft deleting visitor", "err", err)
		writeError(w, http.StatusInternalServerError, "internal_error", "internal error", nil)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// tierFor maps the 12-month gains to a tier and to how many more seeds the
// visitor needs for the next one (null once dourado).
func tierFor(earned int) (string, *int) {
	switch {
	case earned >= douradoAt:
		return tierDourado, nil
	case earned >= raizAt:
		return tierRaiz, intPtr(douradoAt - earned)
	default:
		return tierSemente, intPtr(raizAt - earned)
	}
}

func intPtr(v int) *int { return &v }
