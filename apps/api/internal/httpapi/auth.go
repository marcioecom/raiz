package httpapi

import (
	"context"
	"crypto/rand"
	"crypto/subtle"
	"errors"
	"fmt"
	"log/slog"
	"math/big"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/marcioecom/raiz/apps/api/internal/auth"
	"github.com/marcioecom/raiz/apps/api/internal/config"
	"github.com/marcioecom/raiz/apps/api/internal/pii"
	"github.com/marcioecom/raiz/apps/api/internal/points"
	"github.com/marcioecom/raiz/apps/api/internal/store"
)

const (
	otpTTL      = 5 * time.Minute
	otpMaxTries = 5
	otpDemoCode = "000000"
)

var errInvalidCode = errors.New("invalid code")

// Store is what the auth and profile handlers need. An interface keeps the
// handler tests free of Postgres.
type Store interface {
	VisitorByPhoneHash(ctx context.Context, phoneHash string) (store.Visitor, error)
	VisitorByID(ctx context.Context, id string) (store.Visitor, error)
	CreateVisitor(ctx context.Context, phoneHash, phoneEnc, name string) (store.Visitor, error)
	SoftDeleteVisitor(ctx context.Context, id string) error
	CreateOTP(ctx context.Context, phoneHash, codeHash string, expiresAt time.Time) error
	LatestOTP(ctx context.Context, phoneHash string) (store.OTP, error)
	IncrementOTPAttempts(ctx context.Context, id string) error
	ConsumeOTP(ctx context.Context, id string) error
	MeStats(ctx context.Context, visitorID string) (store.MeStats, error)
	ReceiptWeeks(ctx context.Context, visitorID string) ([]time.Time, error)
	StoreByCNPJ(ctx context.Context, cnpj string) (store.StoreInfo, error)
	ReceiptClaimed(ctx context.Context, accessKey string) (bool, error)
	ReceiptCounters(ctx context.Context, visitorID string, storeID *string, day time.Time) (sameStore, today int, err error)
	CreateReceipt(ctx context.Context, in store.NewReceipt) (store.Receipt, error)
	ReceiptHistory(ctx context.Context, visitorID string, from time.Time) ([]points.ReceiptFact, error)
	Missions(ctx context.Context, visitorID string) ([]store.MissionState, error)
	AwardMission(ctx context.Context, visitorID string, update store.MissionUpdate) (int, error)
	LedgerBalance(ctx context.Context, visitorID string) (int, error)
	LedgerPage(ctx context.Context, visitorID string, before *store.LedgerCursor, limit int) ([]store.LedgerRow, error)
	ActiveSeason(ctx context.Context) (store.Season, error)
	EventsBetween(ctx context.Context, from, to time.Time) ([]store.Event, error)
	ActiveOffers(ctx context.Context, limit int) ([]store.Offer, error)
	AvailableRewards(ctx context.Context) ([]store.RewardOption, error)
	Leaderboard(ctx context.Context, from, to time.Time, limit int) ([]store.LeaderboardRow, error)
	LeaderboardStanding(ctx context.Context, from, to time.Time, visitorID string) (points, position int, err error)
}

// api groups the dependencies of every /v1 handler.
type api struct {
	cfg    config.Config
	log    *slog.Logger
	vault  *pii.Vault
	signer *auth.Signer
	store  Store
	sefaz  points.TotalFetcher
	// now is injectable so the receipt rules are tested without the real clock.
	now func() time.Time
}

func newAPI(cfg config.Config, st Store, log *slog.Logger) (*api, error) {
	vault, err := pii.NewVault(cfg.PIIKey)
	if err != nil {
		return nil, fmt.Errorf("building pii vault: %w", err)
	}
	return &api{
		cfg:    cfg,
		log:    log,
		vault:  vault,
		signer: auth.NewSigner(cfg.JWTSecret),
		store:  st,
		sefaz:  points.LocalFetcher{},
		now:    time.Now,
	}, nil
}

// mount registers the visitor routes. Keeping it in one place means the tests
// exercise exactly the routes the server serves.
func (a *api) mount(r chi.Router) {
	r.Get("/meta", meta(a.cfg))
	r.Post("/auth/otp", a.issueOTP)
	r.Post("/auth/verify", a.verifyOTP)

	r.Group(func(r chi.Router) {
		r.Use(a.requireAuth)
		r.Get("/home", a.getHome)
		r.Get("/me", a.getMe)
		r.Delete("/me", a.deleteMe)
		r.Get("/me/ledger", a.getLedger)
		r.Post("/receipts", a.createReceipt)
		r.Get("/missions", a.getMissions)
		r.Get("/leaderboard", a.getLeaderboard)
	})
}

type otpRequest struct {
	Phone string `json:"phone"`
}

type otpResponse struct {
	Sent      bool    `json:"sent"`
	ExpiresIn int     `json:"expires_in"`
	DemoCode  *string `json:"demo_code"`
}

// issueOTP creates the code. Delivery over WhatsApp Cloud API is not wired yet;
// in demo mode the code is fixed so the flow works on stage.
// shortcut: rate limit pendente
func (a *api) issueOTP(w http.ResponseWriter, r *http.Request) {
	var req otpRequest
	if !decodeJSON(w, r, &req) {
		return
	}

	phone, err := pii.NormalizePhone(req.Phone)
	if err != nil {
		writeError(w, http.StatusUnprocessableEntity, "invalid_phone",
			"phone must have 10 or 11 digits including the area code", nil)
		return
	}

	code := otpDemoCode
	if !a.cfg.DemoMode {
		if code, err = randomCode(); err != nil {
			a.log.Error("otp: generating code", "err", err)
			writeError(w, http.StatusInternalServerError, "internal_error", "internal error", nil)
			return
		}
	}

	expiresAt := time.Now().UTC().Add(otpTTL)
	if err := a.store.CreateOTP(r.Context(), a.vault.Hash(phone), a.vault.Hash(code), expiresAt); err != nil {
		a.log.Error("otp: storing code", "err", err)
		writeError(w, http.StatusInternalServerError, "internal_error", "internal error", nil)
		return
	}

	if !a.cfg.DemoMode {
		// Never log the phone or the code: both are personal data.
		a.log.Warn("otp: WhatsApp delivery is not implemented, the code was only stored")
	}

	resp := otpResponse{Sent: true, ExpiresIn: int(otpTTL.Seconds())}
	if a.cfg.DemoMode {
		demo := otpDemoCode
		resp.DemoCode = &demo
	}
	writeJSON(w, http.StatusAccepted, resp)
}

type verifyRequest struct {
	Phone string `json:"phone"`
	Code  string `json:"code"`
	Name  string `json:"name"`
}

type visitorResponse struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	PhoneMasked string    `json:"phone_masked"`
	CreatedAt   time.Time `json:"created_at"`
}

type verifyResponse struct {
	Token     string          `json:"token"`
	ExpiresAt time.Time       `json:"expires_at"`
	Visitor   visitorResponse `json:"visitor"`
	IsNew     bool            `json:"is_new"`
}

// verifyOTP exchanges the code for a 30 day token, creating the visitor on the
// first access.
// shortcut: rate limit pendente
func (a *api) verifyOTP(w http.ResponseWriter, r *http.Request) {
	var req verifyRequest
	if !decodeJSON(w, r, &req) {
		return
	}

	phone, err := pii.NormalizePhone(req.Phone)
	if err != nil {
		writeError(w, http.StatusUnprocessableEntity, "invalid_phone",
			"phone must have 10 or 11 digits including the area code", nil)
		return
	}

	code := strings.TrimSpace(req.Code)
	if len(code) != 6 {
		writeError(w, http.StatusUnprocessableEntity, "invalid_code_format",
			"code must have 6 digits", nil)
		return
	}

	// In demo mode 000000 is always accepted, even without a prior /auth/otp.
	if !a.cfg.DemoMode {
		if err := a.consumeOTP(r.Context(), phone, code); err != nil {
			if errors.Is(err, errInvalidCode) {
				writeError(w, http.StatusUnauthorized, "invalid_code", "code is invalid or expired", nil)
				return
			}
			a.log.Error("verify: consuming otp", "err", err)
			writeError(w, http.StatusInternalServerError, "internal_error", "internal error", nil)
			return
		}
	} else if code != otpDemoCode {
		writeError(w, http.StatusUnauthorized, "invalid_code",
			"demo mode only accepts the code 000000", nil)
		return
	}

	visitor, isNew, err := a.upsertVisitor(r.Context(), phone, req.Name)
	if errors.Is(err, errNameRequired) {
		writeError(w, http.StatusUnprocessableEntity, "name_required",
			"name is required on the first access", nil)
		return
	}
	if err != nil {
		a.log.Error("verify: resolving visitor", "err", err)
		writeError(w, http.StatusInternalServerError, "internal_error", "internal error", nil)
		return
	}
	if visitor.DeletedAt != nil {
		writeError(w, http.StatusUnauthorized, "account_deleted", "this account was deleted", nil)
		return
	}

	token, expiresAt, err := a.signer.Issue(visitor.ID)
	if err != nil {
		a.log.Error("verify: issuing token", "err", err)
		writeError(w, http.StatusInternalServerError, "internal_error", "internal error", nil)
		return
	}

	writeJSON(w, http.StatusOK, verifyResponse{
		Token:     token,
		ExpiresAt: expiresAt,
		Visitor:   a.visitorView(visitor),
		IsNew:     isNew,
	})
}

var errNameRequired = errors.New("name required")

// upsertVisitor creates the visitor on first access. A double submit can race
// on the unique phone_hash, so a failed insert falls back to a second lookup.
func (a *api) upsertVisitor(ctx context.Context, phone, name string) (store.Visitor, bool, error) {
	phoneHash := a.vault.Hash(phone)

	visitor, err := a.store.VisitorByPhoneHash(ctx, phoneHash)
	if err == nil {
		return visitor, false, nil
	}
	if !errors.Is(err, store.ErrNotFound) {
		return store.Visitor{}, false, err
	}

	name = strings.TrimSpace(name)
	if name == "" {
		return store.Visitor{}, false, errNameRequired
	}

	phoneEnc, err := a.vault.Encrypt(phone)
	if err != nil {
		return store.Visitor{}, false, err
	}
	visitor, err = a.store.CreateVisitor(ctx, phoneHash, phoneEnc, name)
	if err == nil {
		return visitor, true, nil
	}

	if existing, lookupErr := a.store.VisitorByPhoneHash(ctx, phoneHash); lookupErr == nil {
		return existing, false, nil
	}
	return store.Visitor{}, false, err
}

// consumeOTP enforces expiry, the attempt ceiling and single use.
func (a *api) consumeOTP(ctx context.Context, phone, code string) error {
	otp, err := a.store.LatestOTP(ctx, a.vault.Hash(phone))
	if errors.Is(err, store.ErrNotFound) {
		return errInvalidCode
	}
	if err != nil {
		return err
	}

	if otp.ConsumedAt != nil || otp.Attempts >= otpMaxTries || time.Now().UTC().After(otp.ExpiresAt) {
		return errInvalidCode
	}

	want := a.vault.Hash(code)
	if subtle.ConstantTimeCompare([]byte(want), []byte(otp.CodeHash)) != 1 {
		if err := a.store.IncrementOTPAttempts(ctx, otp.ID); err != nil {
			return err
		}
		return errInvalidCode
	}

	if err := a.store.ConsumeOTP(ctx, otp.ID); err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return errInvalidCode
		}
		return err
	}
	return nil
}

type visitorCtxKey struct{}

// requireAuth validates the bearer token and loads the visitor in one query.
func (a *api) requireAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		raw, ok := strings.CutPrefix(r.Header.Get("Authorization"), "Bearer ")
		if !ok || strings.TrimSpace(raw) == "" {
			writeError(w, http.StatusUnauthorized, "unauthorized", "missing bearer token", nil)
			return
		}

		visitorID, err := a.signer.Parse(strings.TrimSpace(raw))
		if err != nil {
			writeError(w, http.StatusUnauthorized, "unauthorized", "invalid or expired token", nil)
			return
		}

		visitor, err := a.store.VisitorByID(r.Context(), visitorID)
		if errors.Is(err, store.ErrNotFound) {
			writeError(w, http.StatusUnauthorized, "unauthorized", "visitor not found", nil)
			return
		}
		if err != nil {
			a.log.Error("auth: loading visitor", "err", err)
			writeError(w, http.StatusInternalServerError, "internal_error", "internal error", nil)
			return
		}
		if visitor.DeletedAt != nil {
			writeError(w, http.StatusUnauthorized, "unauthorized", "visitor not found", nil)
			return
		}

		ctx := context.WithValue(r.Context(), visitorCtxKey{}, visitor)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func visitorFrom(ctx context.Context) store.Visitor {
	visitor, _ := ctx.Value(visitorCtxKey{}).(store.Visitor)
	return visitor
}

// visitorView never returns the stored phone: only the masked form.
func (a *api) visitorView(visitor store.Visitor) visitorResponse {
	masked := ""
	if phone, err := a.vault.Decrypt(visitor.PhoneEnc); err == nil {
		masked = pii.Mask(phone)
	}
	return visitorResponse{
		ID:          visitor.ID,
		Name:        visitor.Name,
		PhoneMasked: masked,
		CreatedAt:   visitor.CreatedAt.UTC(),
	}
}

func randomCode() (string, error) {
	n, err := rand.Int(rand.Reader, big.NewInt(1_000_000))
	if err != nil {
		return "", fmt.Errorf("drawing otp code: %w", err)
	}
	return fmt.Sprintf("%06d", n.Int64()), nil
}
