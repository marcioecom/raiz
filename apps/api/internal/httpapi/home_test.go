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

var homeClock = time.Date(2026, 11, 13, 15, 0, 0, 0, time.UTC) // 12:00 em Palmas

func (s *stubStore) EventsBetween(_ context.Context, from, to time.Time) ([]store.Event, error) {
	events := make([]store.Event, 0, len(s.events))
	for _, event := range s.events {
		if event.StartsAt.Before(from) || !event.StartsAt.Before(to) {
			continue
		}
		events = append(events, event)
	}
	return events, nil
}

func (s *stubStore) ActiveOffers(_ context.Context, limit int) ([]store.Offer, error) {
	return s.offers[:min(len(s.offers), limit)], nil
}

func (s *stubStore) AvailableRewards(context.Context) ([]store.RewardOption, error) {
	return s.rewards, nil
}

// newHomeServer seeds a visitor and fixes the clock so "today" is stable.
func newHomeServer(t *testing.T) (*stubStore, http.Handler, string, string) {
	t.Helper()

	handlers, st, h := newTestServer(t, true)
	handlers.now = func() time.Time { return homeClock }

	visitor, err := st.CreateVisitor(context.Background(), "hash", mustEncrypt(t, handlers, "63999990020"), "Márcio Júnior")
	if err != nil {
		t.Fatalf("seeding visitor: %v", err)
	}
	st.stats = store.MeStats{Balance: 230, Earned: 230}
	return st, h, mustSign(t, "test-jwt-secret-long-enough", visitor.ID), visitor.ID
}

func decodeHome(t *testing.T, h http.Handler, token string) homeResponse {
	t.Helper()

	rec := doJSON(t, h, http.MethodGet, "/v1/home", nil, token)
	if rec.Code != http.StatusOK {
		t.Fatalf("home status = %d, want 200 (%s)", rec.Code, rec.Body.String())
	}
	var body homeResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("decoding home response %q: %v", rec.Body.String(), err)
	}
	return body
}

func TestHomeNextStepPrefersTheMissionClosestToCompletion(t *testing.T) {
	st, h, token, _ := newHomeServer(t)
	st.rewards = []store.RewardOption{{Title: "Café na Casa do Pão", Cost: 250}}
	st.missions = []store.MissionState{
		{Mission: points.Mission{ID: storesMissionID, Title: "Compre em 3 lojas diferentes em 7 dias", RuleType: points.RuleStores, Target: 3, RewardPoints: 150}},
		{Mission: points.Mission{ID: categoryMissionID, Title: "Alimentação + moda na mesma semana", RuleType: points.RuleCategory, Target: 2, RewardPoints: 100}},
	}
	st.counters[storesMissionID] = 1
	st.counters[categoryMissionID] = 1

	body := decodeHome(t, h, token)

	if body.NextStep == nil || body.NextStep.Kind != nextStepMission {
		t.Fatalf("next_step = %+v, want a mission", body.NextStep)
	}
	// One of two is closer than one of three.
	if body.NextStep.Title != "Alimentação + moda na mesma semana" {
		t.Errorf("next_step title = %q, want the category mission", body.NextStep.Title)
	}
	if body.NextStep.Subtitle != "Falta 1 de 2" || body.NextStep.Progress != 1 || body.NextStep.Target != 2 {
		t.Errorf("next_step = %+v, want 1 of 2", body.NextStep)
	}
	if body.NextStep.RewardPoints == nil || *body.NextStep.RewardPoints != 100 || body.NextStep.Href != "/missions" {
		t.Errorf("next_step = %+v, want 100 points and /missions", body.NextStep)
	}
	if body.GreetingName != "Márcio" || !body.Demo || body.Balance != 230 || body.Tier != tierSemente {
		t.Errorf("home = %+v, want the visitor greeting, balance 230 and semente", body)
	}
}

func TestHomeNextStepFallsBackToTheClosestReward(t *testing.T) {
	st, h, token, _ := newHomeServer(t)
	st.rewards = []store.RewardOption{
		{Title: "Sobremesa no Café do Cerrado", Cost: 250},
		{Title: "Café na Casa do Pão", Cost: 300},
		{Title: "2h de estacionamento", Cost: 400},
	}

	body := decodeHome(t, h, token)

	if body.NextStep == nil || body.NextStep.Kind != nextStepReward {
		t.Fatalf("next_step = %+v, want a reward", body.NextStep)
	}
	if body.NextStep.Title != "Sobremesa no Café do Cerrado" || body.NextStep.RewardPoints != nil {
		t.Errorf("next_step = %+v, want the cheapest reward and no reward_points", body.NextStep)
	}
	if body.NextStep.Subtitle != "Faltam 20 sementes" || body.NextStep.Progress != 230 || body.NextStep.Target != 250 {
		t.Errorf("next_step = %+v, want 20 seeds short of 250", body.NextStep)
	}
	if body.NextStep.Href != "/rewards" {
		t.Errorf("next_step href = %q, want /rewards", body.NextStep.Href)
	}
	if body.ClosestReward == nil || body.ClosestReward.Missing != 20 || body.ClosestReward.Cost != 250 {
		t.Errorf("closest_reward = %+v, want 20 missing of 250", body.ClosestReward)
	}
}

func TestHomeNextStepIsNullWhenEverythingIsReached(t *testing.T) {
	st, h, token, _ := newHomeServer(t)
	st.stats = store.MeStats{Balance: 400, Earned: 400}
	st.rewards = []store.RewardOption{{Title: "Café na Casa do Pão", Cost: 300}}

	body := decodeHome(t, h, token)

	if body.NextStep != nil {
		t.Errorf("next_step = %+v, want null", body.NextStep)
	}
	if body.ClosestReward == nil || body.ClosestReward.Missing != 0 {
		t.Errorf("closest_reward = %+v, want the affordable reward with 0 missing", body.ClosestReward)
	}
}

func TestHomeTodayUsesTheMallDay(t *testing.T) {
	st, h, token, _ := newHomeServer(t)
	place := "Praça central"
	st.events = []store.Event{
		// 23:00 of the previous day in Palmas (UTC-3).
		{Title: "Sarau", StartsAt: time.Date(2026, 11, 13, 2, 0, 0, 0, time.UTC)},
		{Title: "Feira do Cerrado", StartsAt: time.Date(2026, 11, 13, 17, 0, 0, 0, time.UTC), Place: &place},
		{Title: "Banda da Terra", StartsAt: time.Date(2026, 11, 13, 20, 30, 0, 0, time.UTC), Place: &place},
	}
	st.offers = []store.Offer{
		{ID: "offer-1", Title: "Café 50% até 18h"},
		{ID: "offer-2", Title: "Segunda peça com 30% off"},
		{ID: "offer-3", Title: "Sessão da tarde por R$ 19"},
		{ID: "offer-4", Title: "Não deve aparecer"},
	}

	body := decodeHome(t, h, token)

	if len(body.Today.Events) != 2 {
		t.Fatalf("events = %+v, want only the two of today", body.Today.Events)
	}
	if body.Today.Events[0].Title != "Feira do Cerrado" || body.Today.Events[1].Title != "Banda da Terra" {
		t.Errorf("events = %+v, want starts_at order", body.Today.Events)
	}
	if body.Today.Events[0].Place == nil || *body.Today.Events[0].Place != place {
		t.Errorf("place = %v, want %q", body.Today.Events[0].Place, place)
	}
	if len(body.Today.Offers) != homeOffersLimit {
		t.Errorf("offers = %+v, want at most %d", body.Today.Offers, homeOffersLimit)
	}
}

func TestHomeTodayIsEmptyWithoutEvents(t *testing.T) {
	_, h, token, _ := newHomeServer(t)

	rec := doJSON(t, h, http.MethodGet, "/v1/home", nil, token)
	if rec.Code != http.StatusOK {
		t.Fatalf("home status = %d, want 200 (%s)", rec.Code, rec.Body.String())
	}

	var raw struct {
		Today struct {
			Events []eventView `json:"events"`
			Offers []offerView `json:"offers"`
		} `json:"today"`
		NextStep *nextStepView `json:"next_step"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &raw); err != nil {
		t.Fatalf("decoding home response: %v", err)
	}
	if raw.Today.Events == nil || len(raw.Today.Events) != 0 {
		t.Errorf("events = %v, want an empty array", raw.Today.Events)
	}
	if raw.Today.Offers == nil || len(raw.Today.Offers) != 0 {
		t.Errorf("offers = %v, want an empty array", raw.Today.Offers)
	}
	if raw.NextStep != nil {
		t.Errorf("next_step = %+v, want null without missions or rewards", raw.NextStep)
	}
}
