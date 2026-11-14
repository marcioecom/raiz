package httpapi

import (
	"context"
	"errors"
	"net/http"
	"sort"
	"time"

	"github.com/marcioecom/raiz/apps/api/internal/points"
	"github.com/marcioecom/raiz/apps/api/internal/store"
)

// seasonView is the safra window. Dates stay calendar days (YYYY-MM-DD).
type seasonView struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	StartsAt string `json:"starts_at"`
	EndsAt   string `json:"ends_at"`
}

func newSeasonView(season store.Season) *seasonView {
	return &seasonView{
		ID:       season.ID,
		Name:     season.Name,
		StartsAt: season.StartsAt.Format(time.DateOnly),
		EndsAt:   season.EndsAt.Format(time.DateOnly),
	}
}

type missionView struct {
	ID           string     `json:"id"`
	Code         string     `json:"code"`
	Title        string     `json:"title"`
	RuleType     string     `json:"rule_type"`
	Target       int        `json:"target"`
	Progress     int        `json:"progress"`
	RewardPoints int        `json:"reward_points"`
	CompletedAt  *time.Time `json:"completed_at"`
}

type missionsResponse struct {
	Season   *seasonView   `json:"season"`
	Missions []missionView `json:"missions"`
}

// getMissions lists the active missions with the progress computed from the
// same rules that credit the bonus. Finished missions go last.
func (a *api) getMissions(w http.ResponseWriter, r *http.Request) {
	visitor := visitorFrom(r.Context())
	ctx := r.Context()

	states, err := a.missionProgress(ctx, visitor.ID, a.now().UTC())
	if err != nil {
		a.log.Error("missions: loading progress", "err", err)
		writeError(w, http.StatusInternalServerError, "internal_error", "internal error", nil)
		return
	}

	season, err := a.store.ActiveSeason(ctx)
	if err != nil && !errors.Is(err, store.ErrNotFound) {
		a.log.Error("missions: loading season", "err", err)
		writeError(w, http.StatusInternalServerError, "internal_error", "internal error", nil)
		return
	}

	views := make([]missionView, 0, len(states))
	for _, state := range states {
		var completedAt *time.Time
		if state.CompletedAt != nil {
			utc := state.CompletedAt.UTC()
			completedAt = &utc
		}
		views = append(views, missionView{
			ID:           state.ID,
			Code:         state.Code,
			Title:        state.Title,
			RuleType:     state.RuleType,
			Target:       state.Target,
			Progress:     state.Counter,
			RewardPoints: state.RewardPoints,
			CompletedAt:  completedAt,
		})
	}

	sort.SliceStable(views, func(i, j int) bool {
		doneI, doneJ := views[i].CompletedAt != nil, views[j].CompletedAt != nil
		if doneI != doneJ {
			return !doneI
		}
		return views[i].Progress > views[j].Progress
	})

	resp := missionsResponse{Season: nil, Missions: views}
	if err == nil {
		resp.Season = newSeasonView(season)
	}
	writeJSON(w, http.StatusOK, resp)
}

// missionProgress merges the stored counters with what the rules compute now.
// The stored counter wins when it is ahead, so a mission that already paid
// keeps its target.
func (a *api) missionProgress(ctx context.Context, visitorID string, now time.Time) ([]store.MissionState, error) {
	states, err := a.store.Missions(ctx, visitorID)
	if err != nil {
		return nil, err
	}

	advanced, err := a.advancePending(ctx, visitorID, states, now)
	if err != nil {
		return nil, err
	}

	computed := make(map[string]int, len(advanced))
	for _, advancement := range advanced {
		computed[advancement.MissionID] = advancement.Progress
	}
	for i := range states {
		if progress := computed[states[i].ID]; progress > states[i].Counter {
			states[i].Counter = progress
		}
	}
	return states, nil
}

// advancePending evaluates the rules for every unfinished mission. Rhythm is not
// in points.Advance because it reads the week history, not the receipt list.
func (a *api) advancePending(ctx context.Context, visitorID string, states []store.MissionState, now time.Time) ([]points.Advancement, error) {
	pending := make([]points.Mission, 0, len(states))
	hasRhythm := false
	for _, state := range states {
		if state.Completed {
			continue
		}
		pending = append(pending, state.Mission)
		hasRhythm = hasRhythm || state.RuleType == points.RuleRhythm
	}
	if len(pending) == 0 {
		return nil, nil
	}

	history, err := a.store.ReceiptHistory(ctx, visitorID, now.Add(-points.HistoryWindow))
	if err != nil {
		return nil, err
	}

	advanced := points.Advance(pending, history, now)

	if hasRhythm {
		weeks, err := a.store.ReceiptWeeks(ctx, visitorID)
		if err != nil {
			return nil, err
		}
		streak := store.StreakWeeks(weeks, now)
		for _, mission := range pending {
			if mission.RuleType != points.RuleRhythm || streak == 0 {
				continue
			}
			progress := min(streak, mission.Target)
			advanced = append(advanced, points.Advancement{
				MissionID:    mission.ID,
				Title:        mission.Title,
				Progress:     progress,
				Target:       mission.Target,
				Completed:    progress >= mission.Target,
				RewardPoints: mission.RewardPoints,
			})
		}
	}
	return advanced, nil
}
