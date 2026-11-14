package httpapi

import (
	"fmt"
	"net/http"
	"strings"
	"time"

	// Distroless images carry no zoneinfo: the mall timezone must work anyway.
	_ "time/tzdata"

	"github.com/marcioecom/raiz/apps/api/internal/store"
)

const (
	nextStepMission = "mission"
	nextStepReward  = "reward"
	homeOffersLimit = 3
)

// mallZone is the timezone of the shopping mall. Tocantins has had no DST
// since 2019, so the fixed offset is only the fallback.
var mallZone = func() *time.Location {
	loc, err := time.LoadLocation("America/Araguaina")
	if err != nil {
		return time.FixedZone("America/Araguaina", -3*60*60)
	}
	return loc
}()

// dayRange is the [start, end) window of the calendar day of now in the mall.
func dayRange(now time.Time) (time.Time, time.Time) {
	local := now.In(mallZone)
	start := time.Date(local.Year(), local.Month(), local.Day(), 0, 0, 0, 0, mallZone)
	return start, start.AddDate(0, 0, 1)
}

type nextStepView struct {
	Kind         string `json:"kind"`
	Title        string `json:"title"`
	Subtitle     string `json:"subtitle"`
	Progress     int    `json:"progress"`
	Target       int    `json:"target"`
	RewardPoints *int   `json:"reward_points"`
	Href         string `json:"href"`
}

type eventView struct {
	Title    string    `json:"title"`
	StartsAt time.Time `json:"starts_at"`
	Place    *string   `json:"place"`
}

type offerView struct {
	ID          string     `json:"id"`
	StoreID     *string    `json:"store_id"`
	StoreName   *string    `json:"store_name"`
	Title       string     `json:"title"`
	Description *string    `json:"description"`
	ValidUntil  *time.Time `json:"valid_until"`
}

type homeToday struct {
	Events []eventView `json:"events"`
	Offers []offerView `json:"offers"`
}

type closestRewardView struct {
	Title   string `json:"title"`
	Cost    int    `json:"cost"`
	Missing int    `json:"missing"`
}

type homeResponse struct {
	Demo          bool               `json:"demo"`
	GreetingName  string             `json:"greeting_name"`
	Balance       int                `json:"balance"`
	Tier          string             `json:"tier"`
	StreakWeeks   int                `json:"streak_weeks"`
	NextStep      *nextStepView      `json:"next_step"`
	Today         homeToday          `json:"today"`
	ClosestReward *closestRewardView `json:"closest_reward"`
}

// getHome feeds the whole home screen with one call: one query per section,
// never one per item.
func (a *api) getHome(w http.ResponseWriter, r *http.Request) {
	visitor := visitorFrom(r.Context())
	ctx := r.Context()
	now := a.now().UTC()

	stats, err := a.store.MeStats(ctx, visitor.ID)
	if err != nil {
		a.log.Error("home: loading stats", "err", err)
		writeError(w, http.StatusInternalServerError, "internal_error", "internal error", nil)
		return
	}

	weeks, err := a.store.ReceiptWeeks(ctx, visitor.ID)
	if err != nil {
		a.log.Error("home: loading receipt weeks", "err", err)
		writeError(w, http.StatusInternalServerError, "internal_error", "internal error", nil)
		return
	}

	missions, err := a.missionProgress(ctx, visitor.ID, now)
	if err != nil {
		a.log.Error("home: loading missions", "err", err)
		writeError(w, http.StatusInternalServerError, "internal_error", "internal error", nil)
		return
	}

	from, to := dayRange(now)
	events, err := a.store.EventsBetween(ctx, from, to)
	if err != nil {
		a.log.Error("home: loading events", "err", err)
		writeError(w, http.StatusInternalServerError, "internal_error", "internal error", nil)
		return
	}

	offers, err := a.store.ActiveOffers(ctx, homeOffersLimit)
	if err != nil {
		a.log.Error("home: loading offers", "err", err)
		writeError(w, http.StatusInternalServerError, "internal_error", "internal error", nil)
		return
	}

	rewards, err := a.store.AvailableRewards(ctx)
	if err != nil {
		a.log.Error("home: loading rewards", "err", err)
		writeError(w, http.StatusInternalServerError, "internal_error", "internal error", nil)
		return
	}

	tier, _ := tierFor(stats.Earned)

	resp := homeResponse{
		Demo:         a.cfg.DemoMode,
		GreetingName: firstName(visitor.Name),
		Balance:      stats.Balance,
		Tier:         tier,
		StreakWeeks:  store.StreakWeeks(weeks, now),
		NextStep:     buildNextStep(missions, rewards, stats.Balance),
		Today:        homeToday{Events: eventViews(events), Offers: offerViews(offers)},
	}
	if closest := closestReward(rewards, stats.Balance); closest != nil {
		resp.ClosestReward = &closestRewardView{
			Title:   closest.Title,
			Cost:    closest.Cost,
			Missing: max(closest.Cost-stats.Balance, 0),
		}
	}

	writeJSON(w, http.StatusOK, resp)
}

// buildNextStep answers "what now": the mission closest to completion, or the
// reward closest to the balance, or nothing at all.
func buildNextStep(missions []store.MissionState, rewards []store.RewardOption, balance int) *nextStepView {
	if mission := nextMission(missions); mission != nil {
		return &nextStepView{
			Kind:         nextStepMission,
			Title:        mission.Title,
			Subtitle:     fmt.Sprintf("Falta %d de %d", mission.Target-mission.Counter, mission.Target),
			Progress:     mission.Counter,
			Target:       mission.Target,
			RewardPoints: &mission.RewardPoints,
			Href:         "/missions",
		}
	}

	if reward := nextReward(rewards, balance); reward != nil {
		return &nextStepView{
			Kind:     nextStepReward,
			Title:    reward.Title,
			Subtitle: missingSeeds(reward.Cost - balance),
			Progress: balance,
			Target:   reward.Cost,
			Href:     "/rewards",
		}
	}
	return nil
}

// nextMission is the unfinished mission with the highest share of its target.
func nextMission(missions []store.MissionState) *store.MissionState {
	var best *store.MissionState
	for i := range missions {
		m := &missions[i]
		if m.Completed || m.Counter <= 0 || m.Target <= 0 {
			continue
		}
		// Cross multiplying avoids floats: counter/target comparisons.
		if best == nil || m.Counter*best.Target > best.Counter*m.Target {
			best = m
		}
	}
	return best
}

// nextReward is the cheapest reward the visitor cannot afford yet.
func nextReward(rewards []store.RewardOption, balance int) *store.RewardOption {
	for i := range rewards {
		if rewards[i].Cost > balance {
			return &rewards[i]
		}
	}
	return nil
}

// closestReward is the reward the visitor reaches first. Once every reward is
// affordable, the cheapest one still reports how far it is (zero).
func closestReward(rewards []store.RewardOption, balance int) *store.RewardOption {
	if next := nextReward(rewards, balance); next != nil {
		return next
	}
	if len(rewards) > 0 {
		return &rewards[0]
	}
	return nil
}

func missingSeeds(missing int) string {
	if missing == 1 {
		return "Falta 1 semente"
	}
	return fmt.Sprintf("Faltam %d sementes", missing)
}

// firstName is enough for a greeting; the profile keeps the full name.
func firstName(name string) string {
	fields := strings.Fields(name)
	if len(fields) == 0 {
		return ""
	}
	return fields[0]
}

func eventViews(events []store.Event) []eventView {
	views := make([]eventView, 0, len(events))
	for _, event := range events {
		views = append(views, eventView{
			Title:    event.Title,
			StartsAt: event.StartsAt.UTC(),
			Place:    event.Place,
		})
	}
	return views
}

func offerViews(offers []store.Offer) []offerView {
	views := make([]offerView, 0, len(offers))
	for _, offer := range offers {
		var validUntil *time.Time
		if offer.ValidUntil != nil {
			utc := offer.ValidUntil.UTC()
			validUntil = &utc
		}
		views = append(views, offerView{
			ID:          offer.ID,
			StoreID:     offer.StoreID,
			StoreName:   offer.StoreName,
			Title:       offer.Title,
			Description: offer.Description,
			ValidUntil:  validUntil,
		})
	}
	return views
}
