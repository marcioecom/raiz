package httpapi

import (
	"crypto/subtle"
	"encoding/base64"
	"errors"
	"math"
	"net/http"
	"strings"
	"time"

	"github.com/marcioecom/raiz/apps/api/internal/store"
)

const (
	offerPageSize      = 50
	metricsDefaultDays = 30
)

// requirePartnerKey gates the partner API with the X-API-Key header. Without a
// configured key the routes answer 404: the feature does not exist, instead of
// looking broken.
func (a *api) requirePartnerKey(next http.Handler) http.Handler {
	if a.cfg.PartnerAPIKey == "" {
		return http.HandlerFunc(notFound)
	}
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		got := r.Header.Get("X-API-Key")
		if subtle.ConstantTimeCompare([]byte(got), []byte(a.cfg.PartnerAPIKey)) != 1 {
			writeError(w, http.StatusUnauthorized, "unauthorized", "invalid or missing api key", nil)
			return
		}
		next.ServeHTTP(w, r)
	})
}

type offersResponse struct {
	Offers     []offerView `json:"offers"`
	NextCursor *string     `json:"next_cursor"`
}

// getOffers is the partner catalog, read from the same table the visitor UI
// uses. The page is fixed at 50 offers, ordered by expiry (nulls last) and id.
func (a *api) getOffers(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query()

	var storeID *string
	if raw := query.Get("store_id"); raw != "" {
		if !isUUID(raw) {
			writeError(w, http.StatusUnprocessableEntity, "invalid_store_id",
				"store_id must be a uuid", nil)
			return
		}
		storeID = &raw
	}

	var after *store.OfferCursor
	if raw := query.Get("cursor"); raw != "" {
		cursor, err := decodeOfferCursor(raw)
		if err != nil {
			writeError(w, http.StatusUnprocessableEntity, "invalid_cursor", "cursor is not valid", nil)
			return
		}
		after = &cursor
	}

	offers, err := a.store.OfferPage(r.Context(), storeID, after, offerPageSize)
	if err != nil {
		a.log.Error("offers: loading page", "err", err)
		writeError(w, http.StatusInternalServerError, "internal_error", "internal error", nil)
		return
	}

	var next *string
	if len(offers) == offerPageSize {
		last := offers[len(offers)-1]
		cursor := encodeOfferCursor(store.OfferCursor{ValidUntil: last.ValidUntil, ID: last.ID})
		next = &cursor
	}

	writeJSON(w, http.StatusOK, offersResponse{Offers: offerViews(offers), NextCursor: next})
}

type metricsPeriod struct {
	From string `json:"from"`
	To   string `json:"to"`
}

type topStoreView struct {
	StoreName string `json:"store_name"`
	Visits    int    `json:"visits"`
}

type metricsSummaryView struct {
	Period           metricsPeriod  `json:"period"`
	IdentifiedVisits int            `json:"identified_visits"`
	UniqueVisitors   int            `json:"unique_visitors"`
	ReturningRate    float64        `json:"returning_rate"`
	CrossStoreRatio  float64        `json:"cross_store_ratio"`
	Redemptions      int            `json:"redemptions"`
	TopStores        []topStoreView `json:"top_stores"`
}

// getMetrics answers aggregated numbers only: no visitor id ever leaves here.
func (a *api) getMetrics(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query()
	today := dayStart(a.now().UTC())

	from, to := today.AddDate(0, 0, -(metricsDefaultDays-1)), today
	if raw := query.Get("from"); raw != "" {
		day, err := time.Parse(time.DateOnly, raw)
		if err != nil {
			writeError(w, http.StatusUnprocessableEntity, "invalid_period",
				"from must be a date in YYYY-MM-DD", nil)
			return
		}
		from = day
	}
	if raw := query.Get("to"); raw != "" {
		day, err := time.Parse(time.DateOnly, raw)
		if err != nil {
			writeError(w, http.StatusUnprocessableEntity, "invalid_period",
				"to must be a date in YYYY-MM-DD", nil)
			return
		}
		to = day
	}
	if from.After(to) {
		writeError(w, http.StatusUnprocessableEntity, "invalid_period",
			"from must not be after to", nil)
		return
	}

	metrics, err := a.store.Metrics(r.Context(), from, to.AddDate(0, 0, 1))
	if err != nil {
		a.log.Error("metrics: loading summary", "err", err)
		writeError(w, http.StatusInternalServerError, "internal_error", "internal error", nil)
		return
	}

	top := make([]topStoreView, 0, len(metrics.TopStores))
	for _, row := range metrics.TopStores {
		top = append(top, topStoreView{StoreName: row.StoreName, Visits: row.Visits})
	}

	writeJSON(w, http.StatusOK, metricsSummaryView{
		Period:           metricsPeriod{From: from.Format(time.DateOnly), To: to.Format(time.DateOnly)},
		IdentifiedVisits: metrics.IdentifiedVisits,
		UniqueVisitors:   metrics.UniqueVisitors,
		ReturningRate:    ratio(metrics.ReturningVisitors, metrics.UniqueVisitors),
		CrossStoreRatio:  ratio(metrics.StoreVisits, metrics.UniqueVisitors),
		Redemptions:      metrics.Redemptions,
		TopStores:        top,
	})
}

func dayStart(t time.Time) time.Time {
	return time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, time.UTC)
}

// ratio keeps the JSON short: three decimals are enough for a dashboard.
func ratio(part, whole int) float64 {
	if whole == 0 {
		return 0
	}
	return math.Round(float64(part)/float64(whole)*1000) / 1000
}

// The offer cursor is opaque on purpose: it is the (valid_until, id) keyset
// position with null meaning "the tail without expiry".
func encodeOfferCursor(cursor store.OfferCursor) string {
	until := ""
	if cursor.ValidUntil != nil {
		until = cursor.ValidUntil.UTC().Format(time.RFC3339Nano)
	}
	return base64.RawURLEncoding.EncodeToString([]byte(until + "|" + cursor.ID))
}

func decodeOfferCursor(encoded string) (store.OfferCursor, error) {
	raw, err := base64.RawURLEncoding.DecodeString(encoded)
	if err != nil {
		return store.OfferCursor{}, err
	}
	until, id, ok := strings.Cut(string(raw), "|")
	if !ok || !isUUID(id) {
		return store.OfferCursor{}, errors.New("malformed offer cursor")
	}
	if until == "" {
		return store.OfferCursor{ID: id}, nil
	}
	at, err := time.Parse(time.RFC3339Nano, until)
	if err != nil {
		return store.OfferCursor{}, err
	}
	return store.OfferCursor{ValidUntil: &at, ID: id}, nil
}
