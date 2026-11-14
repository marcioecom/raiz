package httpapi

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"testing"
	"time"

	"github.com/marcioecom/raiz/apps/api/internal/store"
)

func (s *stubStore) ActiveRewards(context.Context) ([]store.Reward, error) {
	return s.catalog, nil
}

func (s *stubStore) Redeem(_ context.Context, visitorID, rewardID, code string) (store.Redemption, error) {
	for i := range s.catalog {
		reward := s.catalog[i]
		if reward.ID != rewardID {
			continue
		}
		if reward.Stock != nil && *reward.Stock <= 0 {
			return store.Redemption{}, store.ErrOutOfStock
		}

		balance, _ := s.LedgerBalance(context.Background(), visitorID)
		if balance < reward.Cost {
			return store.Redemption{}, &store.InsufficientPointsError{Missing: reward.Cost - balance}
		}
		for _, issued := range s.issued {
			if issued.Code == code {
				return store.Redemption{}, store.ErrCodeCollision
			}
		}

		if reward.Stock != nil {
			left := *reward.Stock - 1
			s.catalog[i].Stock = &left
			reward.Stock = &left
		}

		redemption := store.Redemption{
			ID:           fmt.Sprintf("77777777-7777-4777-8777-%012d", len(s.issued)+1),
			Code:         code,
			ExpiresAt:    receiptClock.Add(store.RedemptionTTL),
			BalanceAfter: balance - reward.Cost,
			Reward:       reward,
		}
		s.issued = append(s.issued, redemption)
		s.appendLedger(stubLedgerRow{VisitorID: visitorID, Kind: "redeem", Delta: -reward.Cost})
		return redemption, nil
	}
	return store.Redemption{}, store.ErrNotFound
}

func newRewardsServer(t *testing.T) (*stubStore, http.Handler, string, string) {
	t.Helper()

	handlers, st, h := newTestServer(t, true)
	handlers.now = func() time.Time { return receiptClock }

	visitor, err := st.CreateVisitor(context.Background(), "hash", mustEncrypt(t, handlers, "63999990030"), "Clara")
	if err != nil {
		t.Fatalf("seeding visitor: %v", err)
	}
	return st, h, mustSign(t, "test-jwt-secret-long-enough", visitor.ID), visitor.ID
}

func seedBalance(st *stubStore, visitorID string, seeds int) {
	st.appendLedger(stubLedgerRow{VisitorID: visitorID, Kind: "receipt", Delta: seeds})
}

func strPtr(s string) *string { return &s }

var coffeeReward = store.Reward{
	ID:        "44444444-4444-4444-4444-444444444401",
	Title:     "Café na Casa do Pão",
	Cost:      300,
	Stock:     intPtr(2),
	StoreName: strPtr("Casa do Pão"),
	Terms:     strPtr("Válido de segunda a sexta, das 8h às 11h."),
}

func TestGetRewardsFlagsWhatTheBalanceReaches(t *testing.T) {
	st, h, token, visitorID := newRewardsServer(t)
	seedBalance(st, visitorID, 300)
	st.catalog = []store.Reward{
		coffeeReward,
		{ID: "44444444-4444-4444-4444-444444444402", Title: "2h de estacionamento", Cost: 400},
	}

	rec := doJSON(t, h, http.MethodGet, "/v1/rewards", nil, token)
	if rec.Code != http.StatusOK {
		t.Fatalf("rewards status = %d, want 200 (%s)", rec.Code, rec.Body.String())
	}

	var body rewardsResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("decoding rewards response %q: %v", rec.Body.String(), err)
	}
	if body.Balance != 300 || len(body.Rewards) != 2 {
		t.Fatalf("rewards = %+v, want balance 300 and 2 items", body)
	}
	if body.Rewards[1].Affordable || !body.Rewards[0].Affordable {
		t.Errorf("affordable = %v/%v, want only the 300 one", body.Rewards[0].Affordable, body.Rewards[1].Affordable)
	}
	if body.Rewards[0].StoreName == nil || *body.Rewards[0].StoreName != "Casa do Pão" {
		t.Errorf("store_name = %v, want Casa do Pão", body.Rewards[0].StoreName)
	}
	if body.Rewards[0].Terms == nil || body.Rewards[1].Terms != nil {
		t.Errorf("terms = %v/%v, want only the reward with terms", body.Rewards[0].Terms, body.Rewards[1].Terms)
	}
}

func TestRedeemDebitsTheLedgerAndTakesStock(t *testing.T) {
	st, h, token, visitorID := newRewardsServer(t)
	seedBalance(st, visitorID, 310)
	st.catalog = []store.Reward{coffeeReward}

	rec := doJSON(t, h, http.MethodPost, "/v1/rewards/"+coffeeReward.ID+"/redeem", nil, token)
	if rec.Code != http.StatusCreated {
		t.Fatalf("redeem status = %d, want 201 (%s)", rec.Code, rec.Body.String())
	}

	var body redemptionView
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("decoding redemption %q: %v", rec.Body.String(), err)
	}
	if len(body.Code) != redeemCodeLength {
		t.Errorf("code = %q, want %d characters", body.Code, redeemCodeLength)
	}
	for _, char := range body.Code {
		if !strings.ContainsRune(redeemCodeAlphabet, char) {
			t.Errorf("code %q has the ambiguous character %q", body.Code, char)
		}
	}
	if body.BalanceAfter != 10 || body.Reward.Cost != 300 || body.Reward.Affordable {
		t.Errorf("redemption = %+v, want balance 10 and the 300 seed reward", body)
	}
	if body.ExpiresAt.Sub(receiptClock) != store.RedemptionTTL {
		t.Errorf("expires_at = %s, want %s after the redemption", body.ExpiresAt, store.RedemptionTTL)
	}
	if body.Reward.Stock == nil || *body.Reward.Stock != 1 {
		t.Errorf("stock in the response = %v, want the remaining 1", body.Reward.Stock)
	}
	if st.catalog[0].Stock == nil || *st.catalog[0].Stock != 1 {
		t.Errorf("stock = %v, want 1", st.catalog[0].Stock)
	}
	if balance, _ := st.LedgerBalance(context.Background(), visitorID); balance != 10 {
		t.Errorf("balance = %d, want 10", balance)
	}
	if len(st.issued) != 1 || st.issued[0].Code != body.Code {
		t.Errorf("issued = %+v, want the returned voucher", st.issued)
	}
}

func TestRedeemRejectsInsufficientPoints(t *testing.T) {
	st, h, token, visitorID := newRewardsServer(t)
	seedBalance(st, visitorID, 100)
	st.catalog = []store.Reward{coffeeReward}

	rec := doJSON(t, h, http.MethodPost, "/v1/rewards/"+coffeeReward.ID+"/redeem", nil, token)
	if rec.Code != http.StatusConflict || errorCode(t, rec) != "insufficient_points" {
		t.Fatalf("redeem = %d %s, want 409 insufficient_points", rec.Code, rec.Body.String())
	}

	var envelope struct {
		Error struct {
			Details struct {
				Missing int `json:"missing"`
			} `json:"details"`
		} `json:"error"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &envelope); err != nil {
		t.Fatalf("decoding error details: %v", err)
	}
	if envelope.Error.Details.Missing != 200 {
		t.Errorf("details.missing = %d, want 200", envelope.Error.Details.Missing)
	}
	if balance, _ := st.LedgerBalance(context.Background(), visitorID); balance != 100 {
		t.Errorf("balance = %d, want the untouched 100", balance)
	}
	if len(st.issued) != 0 {
		t.Errorf("issued = %+v, want no voucher", st.issued)
	}
}

func TestRedeemRejectsOutOfStock(t *testing.T) {
	st, h, token, visitorID := newRewardsServer(t)
	seedBalance(st, visitorID, 1000)
	reward := coffeeReward
	reward.Stock = intPtr(0)
	st.catalog = []store.Reward{reward}

	rec := doJSON(t, h, http.MethodPost, "/v1/rewards/"+reward.ID+"/redeem", nil, token)
	if rec.Code != http.StatusConflict || errorCode(t, rec) != "out_of_stock" {
		t.Fatalf("redeem = %d %s, want 409 out_of_stock", rec.Code, rec.Body.String())
	}
	if balance, _ := st.LedgerBalance(context.Background(), visitorID); balance != 1000 {
		t.Errorf("balance = %d, want the untouched 1000", balance)
	}
}

func TestRedeemRejectsUnknownReward(t *testing.T) {
	_, h, token, _ := newRewardsServer(t)

	for _, id := range []string{"44444444-4444-4444-4444-4444444444ff", "not-a-uuid"} {
		rec := doJSON(t, h, http.MethodPost, "/v1/rewards/"+id+"/redeem", nil, token)
		if rec.Code != http.StatusNotFound || errorCode(t, rec) != "reward_not_found" {
			t.Errorf("redeem %q = %d %s, want 404 reward_not_found", id, rec.Code, rec.Body.String())
		}
	}
}
