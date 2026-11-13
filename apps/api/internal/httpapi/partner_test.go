package httpapi

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"sort"
	"testing"
	"time"

	"github.com/marcioecom/raiz/apps/api/internal/config"
	"github.com/marcioecom/raiz/apps/api/internal/store"
)

const testPartnerKey = "partner-test-key"

func (s *stubStore) OfferPage(_ context.Context, storeID *string, after *store.OfferCursor, limit int) ([]store.Offer, error) {
	offers := make([]store.Offer, 0, len(s.offers))
	for _, offer := range s.offers {
		if storeID != nil && (offer.StoreID == nil || *offer.StoreID != *storeID) {
			continue
		}
		offers = append(offers, offer)
	}

	// Same order as the SQL: valid_until nulls last, then id.
	sort.Slice(offers, func(i, j int) bool {
		a, b := offers[i], offers[j]
		if (a.ValidUntil == nil) != (b.ValidUntil == nil) {
			return a.ValidUntil != nil
		}
		if a.ValidUntil != nil && !a.ValidUntil.Equal(*b.ValidUntil) {
			return a.ValidUntil.Before(*b.ValidUntil)
		}
		return a.ID < b.ID
	})

	page := make([]store.Offer, 0, limit)
	for _, offer := range offers {
		if after != nil && !offerAfter(offer, *after) {
			continue
		}
		page = append(page, offer)
		if len(page) == limit {
			break
		}
	}
	return page, nil
}

func offerAfter(offer store.Offer, after store.OfferCursor) bool {
	if (offer.ValidUntil == nil) != (after.ValidUntil == nil) {
		return offer.ValidUntil == nil
	}
	if offer.ValidUntil != nil && !offer.ValidUntil.Equal(*after.ValidUntil) {
		return offer.ValidUntil.After(*after.ValidUntil)
	}
	return offer.ID > after.ID
}

func (s *stubStore) Metrics(context.Context, time.Time, time.Time) (store.Metrics, error) {
	return s.metrics, nil
}

func newPartnerServer(t *testing.T, key string) (*api, *stubStore, http.Handler) {
	t.Helper()

	return newTestServerWith(t, config.Config{
		Env:           "test",
		JWTSecret:     "test-jwt-secret-long-enough",
		PIIKey:        testPIIKey,
		PartnerAPIKey: key,
	})
}

func getWithKey(t *testing.T, h http.Handler, path, key string) *httptest.ResponseRecorder {
	t.Helper()

	req := httptest.NewRequest(http.MethodGet, path, nil)
	if key != "" {
		req.Header.Set("X-API-Key", key)
	}
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	return rec
}

func TestPartnerRoutesAreHiddenWithoutAKey(t *testing.T) {
	_, _, h := newPartnerServer(t, "")

	for _, path := range []string{"/v1/offers", "/v1/metrics/summary"} {
		rec := getWithKey(t, h, path, testPartnerKey)
		if rec.Code != http.StatusNotFound || errorCode(t, rec) != "not_found" {
			t.Errorf("%s = %d %s, want 404 not_found", path, rec.Code, rec.Body.String())
		}
	}
}

func TestPartnerRoutesRequireTheKey(t *testing.T) {
	_, _, h := newPartnerServer(t, testPartnerKey)

	for _, key := range []string{"", "wrong-key"} {
		rec := getWithKey(t, h, "/v1/offers", key)
		if rec.Code != http.StatusUnauthorized || errorCode(t, rec) != "unauthorized" {
			t.Errorf("offers with key %q = %d %s, want 401 unauthorized", key, rec.Code, rec.Body.String())
		}
	}
	if rec := getWithKey(t, h, "/v1/offers", testPartnerKey); rec.Code != http.StatusOK {
		t.Errorf("offers with the right key = %d, want 200 (%s)", rec.Code, rec.Body.String())
	}
}

func TestOffersPaginateByCursor(t *testing.T) {
	_, st, h := newPartnerServer(t, testPartnerKey)

	for i := 0; i < 55; i++ {
		offer := store.Offer{ID: fmt.Sprintf("55555555-5555-4555-8555-%012d", i), Title: fmt.Sprintf("Oferta %d", i)}
		if i%2 == 0 {
			until := homeClock.Add(time.Duration(i) * time.Hour)
			offer.ValidUntil = &until
		}
		st.offers = append(st.offers, offer)
	}

	first := getWithKey(t, h, "/v1/offers", testPartnerKey)
	if first.Code != http.StatusOK {
		t.Fatalf("offers status = %d, want 200 (%s)", first.Code, first.Body.String())
	}
	var page offersResponse
	if err := json.Unmarshal(first.Body.Bytes(), &page); err != nil {
		t.Fatalf("decoding offers %q: %v", first.Body.String(), err)
	}
	if len(page.Offers) != offerPageSize || page.NextCursor == nil {
		t.Fatalf("first page = %d offers, cursor %v; want %d and a cursor", len(page.Offers), page.NextCursor, offerPageSize)
	}

	second := getWithKey(t, h, "/v1/offers?cursor="+*page.NextCursor, testPartnerKey)
	if second.Code != http.StatusOK {
		t.Fatalf("second page = %d, want 200 (%s)", second.Code, second.Body.String())
	}
	if err := json.Unmarshal(second.Body.Bytes(), &page); err != nil {
		t.Fatalf("decoding second page: %v", err)
	}
	if len(page.Offers) != 5 || page.NextCursor != nil {
		t.Errorf("second page = %d offers, cursor %v; want 5 and no cursor", len(page.Offers), page.NextCursor)
	}

	if rec := getWithKey(t, h, "/v1/offers?cursor=not-base64", testPartnerKey); rec.Code != http.StatusUnprocessableEntity {
		t.Errorf("invalid cursor = %d, want 422 (%s)", rec.Code, rec.Body.String())
	}
	if rec := getWithKey(t, h, "/v1/offers?store_id=nope", testPartnerKey); rec.Code != http.StatusUnprocessableEntity {
		t.Errorf("invalid store_id = %d, want 422 (%s)", rec.Code, rec.Body.String())
	}
}

func TestOffersFilterByStore(t *testing.T) {
	_, st, h := newPartnerServer(t, testPartnerKey)
	wanted := "11111111-1111-1111-1111-111111111101"
	st.offers = []store.Offer{
		{ID: "55555555-5555-4555-8555-000000000001", StoreID: &wanted, Title: "Café 50%"},
		{ID: "55555555-5555-4555-8555-000000000002", Title: "2h de estacionamento"},
	}

	rec := getWithKey(t, h, "/v1/offers?store_id="+wanted, testPartnerKey)
	if rec.Code != http.StatusOK {
		t.Fatalf("offers status = %d, want 200 (%s)", rec.Code, rec.Body.String())
	}

	var page offersResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &page); err != nil {
		t.Fatalf("decoding offers: %v", err)
	}
	if len(page.Offers) != 1 || page.Offers[0].Title != "Café 50%" {
		t.Errorf("offers = %+v, want only the store offer", page.Offers)
	}
}

func TestMetricsSummarizeThePeriod(t *testing.T) {
	handlers, st, h := newPartnerServer(t, testPartnerKey)
	handlers.now = func() time.Time { return homeClock }
	st.metrics = store.Metrics{
		IdentifiedVisits:  10,
		UniqueVisitors:    4,
		ReturningVisitors: 2,
		StoreVisits:       6,
		Redemptions:       3,
		TopStores:         []store.StoreVisits{{StoreName: "Casa do Pão", Visits: 4}},
	}

	rec := getWithKey(t, h, "/v1/metrics/summary", testPartnerKey)
	if rec.Code != http.StatusOK {
		t.Fatalf("metrics status = %d, want 200 (%s)", rec.Code, rec.Body.String())
	}

	var body metricsSummaryView
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("decoding metrics %q: %v", rec.Body.String(), err)
	}
	// Default window: the last 30 days ending today.
	if body.Period.From != "2026-10-15" || body.Period.To != "2026-11-13" {
		t.Errorf("period = %+v, want the last 30 days", body.Period)
	}
	if body.ReturningRate != 0.5 || body.CrossStoreRatio != 1.5 {
		t.Errorf("rates = %v/%v, want 0.5 and 1.5", body.ReturningRate, body.CrossStoreRatio)
	}
	if body.IdentifiedVisits != 10 || body.Redemptions != 3 || len(body.TopStores) != 1 {
		t.Errorf("metrics = %+v, want the aggregated numbers", body)
	}

	explicit := getWithKey(t, h, "/v1/metrics/summary?from=2026-11-01&to=2026-11-02", testPartnerKey)
	if err := json.Unmarshal(explicit.Body.Bytes(), &body); err != nil {
		t.Fatalf("decoding explicit period: %v", err)
	}
	if body.Period.From != "2026-11-01" || body.Period.To != "2026-11-02" {
		t.Errorf("period = %+v, want the requested days", body.Period)
	}

	for _, path := range []string{
		"/v1/metrics/summary?from=2026-11-05&to=2026-11-01",
		"/v1/metrics/summary?from=ontem",
		"/v1/metrics/summary?to=2026-13-01",
	} {
		if rec := getWithKey(t, h, path, testPartnerKey); rec.Code != http.StatusUnprocessableEntity {
			t.Errorf("%s = %d, want 422 (%s)", path, rec.Code, rec.Body.String())
		}
	}
}

func TestMetricsWithAnEmptyPeriodReturnZeros(t *testing.T) {
	handlers, _, h := newPartnerServer(t, testPartnerKey)
	handlers.now = func() time.Time { return homeClock }

	rec := getWithKey(t, h, "/v1/metrics/summary", testPartnerKey)
	if rec.Code != http.StatusOK {
		t.Fatalf("metrics status = %d, want 200 (%s)", rec.Code, rec.Body.String())
	}

	var raw map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &raw); err != nil {
		t.Fatalf("decoding metrics: %v", err)
	}
	for _, field := range []string{"identified_visits", "unique_visitors", "returning_rate", "cross_store_ratio", "redemptions"} {
		if raw[field] != float64(0) {
			t.Errorf("%s = %v, want 0", field, raw[field])
		}
	}
	if top, ok := raw["top_stores"].([]any); !ok || len(top) != 0 {
		t.Errorf("top_stores = %v, want an empty array", raw["top_stores"])
	}
}
