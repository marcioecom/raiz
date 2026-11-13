package httpapi

import (
	"crypto/rand"
	"errors"
	"math/big"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/marcioecom/raiz/apps/api/internal/store"
)

const (
	// redeemCodeAlphabet drops the ambiguous characters (0/O, 1/I/L) so the
	// code is readable at the counter.
	redeemCodeAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
	redeemCodeLength   = 6
	// redeemCodeTries: the unique constraint is the guarantee, a retry is just
	// the cheap way out of a 1-in-a-billion collision.
	redeemCodeTries = 3
)

type rewardView struct {
	ID         string  `json:"id"`
	Title      string  `json:"title"`
	Cost       int     `json:"cost"`
	Stock      *int    `json:"stock"`
	StoreName  *string `json:"store_name"`
	Terms      *string `json:"terms"`
	Affordable bool    `json:"affordable"`
}

type rewardsResponse struct {
	Balance int          `json:"balance"`
	Rewards []rewardView `json:"rewards"`
}

type redemptionView struct {
	ID           string     `json:"id"`
	Code         string     `json:"code"`
	ExpiresAt    time.Time  `json:"expires_at"`
	BalanceAfter int        `json:"balance_after"`
	Reward       rewardView `json:"reward"`
}

func newRewardView(reward store.Reward, balance int) rewardView {
	return rewardView{
		ID:         reward.ID,
		Title:      reward.Title,
		Cost:       reward.Cost,
		Stock:      reward.Stock,
		StoreName:  reward.StoreName,
		Terms:      reward.Terms,
		Affordable: reward.Cost <= balance,
	}
}

// getRewards lists the active catalog cheapest first, with what the balance
// already reaches.
func (a *api) getRewards(w http.ResponseWriter, r *http.Request) {
	visitor := visitorFrom(r.Context())

	rewards, err := a.store.ActiveRewards(r.Context())
	if err != nil {
		a.log.Error("rewards: loading catalog", "err", err)
		writeError(w, http.StatusInternalServerError, "internal_error", "internal error", nil)
		return
	}

	balance, err := a.store.LedgerBalance(r.Context(), visitor.ID)
	if err != nil {
		a.log.Error("rewards: loading balance", "err", err)
		writeError(w, http.StatusInternalServerError, "internal_error", "internal error", nil)
		return
	}

	views := make([]rewardView, 0, len(rewards))
	for _, reward := range rewards {
		views = append(views, newRewardView(reward, balance))
	}

	writeJSON(w, http.StatusOK, rewardsResponse{Balance: balance, Rewards: views})
}

// redeem issues a voucher in one transaction: the balance can never go
// negative because the store checks it after locking the reward.
func (a *api) redeem(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if !isUUID(id) {
		writeError(w, http.StatusNotFound, "reward_not_found", "reward not found", nil)
		return
	}

	visitor := visitorFrom(r.Context())
	for attempt := 0; attempt < redeemCodeTries; attempt++ {
		code, err := newRedemptionCode()
		if err != nil {
			a.log.Error("redeem: drawing code", "err", err)
			writeError(w, http.StatusInternalServerError, "internal_error", "internal error", nil)
			return
		}

		redemption, err := a.store.Redeem(r.Context(), visitor.ID, id, code)
		if errors.Is(err, store.ErrCodeCollision) {
			continue
		}
		if errors.Is(err, store.ErrNotFound) {
			writeError(w, http.StatusNotFound, "reward_not_found", "reward not found", nil)
			return
		}
		if errors.Is(err, store.ErrOutOfStock) {
			writeError(w, http.StatusConflict, "out_of_stock", "this reward has no units left", nil)
			return
		}
		var insufficient *store.InsufficientPointsError
		if errors.As(err, &insufficient) {
			writeError(w, http.StatusConflict, "insufficient_points",
				"not enough seeds for this reward", map[string]int{"missing": insufficient.Missing})
			return
		}
		if err != nil {
			a.log.Error("redeem: redeeming reward", "err", err)
			writeError(w, http.StatusInternalServerError, "internal_error", "internal error", nil)
			return
		}

		writeJSON(w, http.StatusCreated, redemptionView{
			ID:           redemption.ID,
			Code:         redemption.Code,
			ExpiresAt:    redemption.ExpiresAt.UTC(),
			BalanceAfter: redemption.BalanceAfter,
			Reward:       newRewardView(redemption.Reward, redemption.BalanceAfter),
		})
		return
	}

	a.log.Error("redeem: voucher code collided three times")
	writeError(w, http.StatusInternalServerError, "internal_error", "internal error", nil)
}

func newRedemptionCode() (string, error) {
	alphabet := big.NewInt(int64(len(redeemCodeAlphabet)))
	code := make([]byte, redeemCodeLength)
	for i := range code {
		n, err := rand.Int(rand.Reader, alphabet)
		if err != nil {
			return "", err
		}
		code[i] = redeemCodeAlphabet[n.Int64()]
	}
	return string(code), nil
}
