package httpapi

import (
	"context"
	"errors"
	"net/http"
	"time"

	"github.com/marcioecom/raiz/apps/api/internal/points"
	"github.com/marcioecom/raiz/apps/api/internal/receipt"
	"github.com/marcioecom/raiz/apps/api/internal/store"
)

type receiptRequest struct {
	AccessKey string `json:"access_key"`
	Source    string `json:"source"`
}

type receiptView struct {
	ID            string    `json:"id"`
	StoreName     *string   `json:"store_name"`
	Category      *string   `json:"category"`
	TotalCents    *int      `json:"total_cents"`
	PointsAwarded int       `json:"points_awarded"`
	IssuedAt      time.Time `json:"issued_at"`
	Status        string    `json:"status"`
}

type receiptResult struct {
	Receipt          receiptView          `json:"receipt"`
	Balance          int                  `json:"balance"`
	MissionsAdvanced []points.Advancement `json:"missions_advanced"`
}

// createReceipt validates the access key locally, applies the antifraud rules
// and writes the receipt plus its ledger credit in one transaction.
//
// The Idempotency-Key header is accepted but not required: the fiscal access
// key itself is the idempotency, guarded by the unique constraint in receipts.
func (a *api) createReceipt(w http.ResponseWriter, r *http.Request) {
	var req receiptRequest
	if !decodeJSON(w, r, &req) {
		return
	}

	key, err := receipt.Parse(req.AccessKey)
	if err != nil {
		code := "invalid_access_key"
		var codeErr *receipt.CodeError
		if errors.As(err, &codeErr) {
			code = codeErr.Code
		}
		writeError(w, http.StatusUnprocessableEntity, code, err.Error(), map[string]string{"field": "access_key"})
		return
	}

	source := req.Source
	if source == "" {
		source = "qr"
	}
	if source != "qr" && source != "manual" {
		writeError(w, http.StatusUnprocessableEntity, "invalid_source",
			"source must be qr or manual", map[string]string{"field": "source"})
		return
	}

	visitor := visitorFrom(r.Context())
	now := a.now().UTC()
	issuedAt := receipt.IssuedAt(key, now)

	// A repeated key always answers 409, even if the day limits would also
	// reject it: the offline queue retries, and the key is the idempotency.
	claimed, err := a.store.ReceiptClaimed(r.Context(), key.Raw)
	if err != nil {
		a.log.Error("receipts: checking access key", "err", err)
		writeError(w, http.StatusInternalServerError, "internal_error", "internal error", nil)
		return
	}
	if claimed {
		writeError(w, http.StatusConflict, "already_claimed", "this receipt was already registered", nil)
		return
	}

	partner, err := a.store.StoreByCNPJ(r.Context(), key.CNPJ)
	known := err == nil
	if err != nil && !errors.Is(err, store.ErrNotFound) {
		a.log.Error("receipts: loading store", "err", err)
		writeError(w, http.StatusInternalServerError, "internal_error", "internal error", nil)
		return
	}

	var storeID *string
	if known {
		storeID = &partner.ID
	}

	sameStore, today, err := a.store.ReceiptCounters(r.Context(), visitor.ID, storeID, issuedAt)
	if err != nil {
		a.log.Error("receipts: counting receipts", "err", err)
		writeError(w, http.StatusInternalServerError, "internal_error", "internal error", nil)
		return
	}
	if err := points.CheckReceipt(issuedAt, now, sameStore, today); err != nil {
		var ruleErr *points.RuleError
		if errors.As(err, &ruleErr) {
			writeError(w, http.StatusUnprocessableEntity, ruleErr.Code, ruleErr.Message, nil)
			return
		}
		a.log.Error("receipts: checking rules", "err", err)
		writeError(w, http.StatusInternalServerError, "internal_error", "internal error", nil)
		return
	}

	totalCents, awarded := a.receiptScore(r.Context(), key.Raw, receipt.QRParam(req.AccessKey), known)

	status := "accepted"
	if !known {
		// Unknown CNPJ: base value and the review queue, never an error.
		status = "review"
	}

	created, err := a.store.CreateReceipt(r.Context(), store.NewReceipt{
		VisitorID:  visitor.ID,
		StoreID:    storeID,
		AccessKey:  key.Raw,
		TotalCents: totalCents,
		IssuedAt:   issuedAt,
		Points:     awarded,
		Source:     source,
		Status:     status,
	})
	if errors.Is(err, store.ErrAlreadyClaimed) {
		writeError(w, http.StatusConflict, "already_claimed", "this receipt was already registered", nil)
		return
	}
	if err != nil {
		a.log.Error("receipts: storing receipt", "err", err)
		writeError(w, http.StatusInternalServerError, "internal_error", "internal error", nil)
		return
	}

	// The receipt credit is already committed, so a mission failure is logged
	// and does not turn a success into an error: the next scan re-evaluates.
	advanced, err := a.advanceMissions(r.Context(), visitor.ID, now)
	if err != nil {
		a.log.Error("receipts: advancing missions", "err", err)
	}

	balance, err := a.store.LedgerBalance(r.Context(), visitor.ID)
	if err != nil {
		a.log.Error("receipts: loading balance", "err", err)
		writeError(w, http.StatusInternalServerError, "internal_error", "internal error", nil)
		return
	}

	view := receiptView{
		ID:            created.ID,
		TotalCents:    totalCents,
		PointsAwarded: awarded,
		IssuedAt:      created.IssuedAt.UTC(),
		Status:        status,
	}
	if known {
		view.StoreName = &partner.Name
		view.Category = &partner.Category
	}

	writeJSON(w, http.StatusCreated, receiptResult{
		Receipt:          view,
		Balance:          balance,
		MissionsAdvanced: advanced,
	})
}

// receiptScore is the optional SEFAZ enrichment. Any failure means no total and
// the base value: an external API never blocks the credit.
func (a *api) receiptScore(ctx context.Context, accessKey, qrParam string, known bool) (*int, int) {
	if !known {
		return nil, points.BaseReceipt
	}

	ctx, cancel := context.WithTimeout(ctx, points.FetchTimeout)
	defer cancel()

	cents, ok, err := a.sefaz.FetchTotal(ctx, accessKey, qrParam)
	if err != nil {
		a.log.Warn("receipts: sefaz enrichment failed, keeping the base value", "err", err)
		return nil, points.BaseReceipt
	}
	if !ok {
		return nil, points.BaseReceipt
	}

	total := int(cents)
	return &total, points.ReceiptPoints(cents)
}

// advanceMissions evaluates the pending missions and credits the bonus of the
// ones this receipt completed. Completed missions are skipped, so a mission
// pays once per visitor.
func (a *api) advanceMissions(ctx context.Context, visitorID string, now time.Time) ([]points.Advancement, error) {
	states, err := a.store.Missions(ctx, visitorID)
	if err != nil {
		return nil, err
	}

	advanced, err := a.advancePending(ctx, visitorID, states, now)
	if err != nil {
		return nil, err
	}
	if advanced == nil {
		return []points.Advancement{}, nil
	}

	for i := range advanced {
		awarded, err := a.store.AwardMission(ctx, visitorID, store.MissionUpdate{
			ID:           advanced[i].MissionID,
			Counter:      advanced[i].Progress,
			Target:       advanced[i].Target,
			RewardPoints: advanced[i].RewardPoints,
		})
		if err != nil {
			return advanced[:i], err
		}
		// Only the call that claimed the completion reports it.
		advanced[i].PointsAwarded = awarded
		advanced[i].Completed = awarded > 0
	}
	return advanced, nil
}
