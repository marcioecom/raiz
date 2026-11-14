package sefaz

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"
)

const (
	testKey   = "17261130112222000167651030000059211341146674"
	testQR    = testKey + "|2|1|1|234f35bd2d71c3186d9ccc635f5ec826aa7d02d4"
	otherCNPJ = "30112222000167"
)

func authorizedXML(status, cnpj, total string) string {
	return `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
  <NFe><infNFe Id="NFe` + testKey + `" versao="4.00">
    <ide><dhEmi>2026-11-13T12:54:52-03:00</dhEmi></ide>
    <emit><CNPJ>` + cnpj + `</CNPJ><xNome>Supermercado</xNome></emit>
    <total><ICMSTot><vNF>` + total + `</vNF></ICMSTot></total>
  </infNFe></NFe>
  <protNFe versao="4.00"><infProt>
    <chNFe>` + testKey + `</chNFe><cStat>` + status + `</cStat>
    <xMotivo>Autorizado o uso da NF-e</xMotivo>
  </infProt></protNFe>
</nfeProc>`
}

func newServer(t *testing.T, handler http.HandlerFunc) *Client {
	t.Helper()
	srv := httptest.NewServer(handler)
	t.Cleanup(srv.Close)
	return New(srv.URL)
}

func TestFetchTotalReadsTheAuthorizedTotal(t *testing.T) {
	var got request
	client := newServer(t, func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			t.Errorf("method = %s, want POST", r.Method)
		}
		if err := json.NewDecoder(r.Body).Decode(&got); err != nil {
			t.Fatalf("decoding body: %v", err)
		}
		_ = json.NewEncoder(w).Encode(response{XML: authorizedXML("100", otherCNPJ, "65.88")})
	})

	cents, ok, err := client.FetchTotal(context.Background(), testKey, testQR)
	if err != nil || !ok {
		t.Fatalf("FetchTotal() = %d, %v, %v; want 6588, true, nil", cents, ok, err)
	}
	if cents != 6588 {
		t.Errorf("cents = %d, want 6588", cents)
	}
	if got.Key != testKey || got.QRParam != testQR {
		t.Errorf("request = %+v, want the key and the QR payload", got)
	}
}

func TestFetchTotalSkipsWithoutQRPayload(t *testing.T) {
	var calls atomic.Int32
	client := newServer(t, func(http.ResponseWriter, *http.Request) { calls.Add(1) })

	if _, ok, err := client.FetchTotal(context.Background(), testKey, ""); ok || err != nil {
		t.Errorf("manual entry = %v, %v; want false, nil", ok, err)
	}
	if calls.Load() != 0 {
		t.Errorf("HTTP calls = %d, want 0", calls.Load())
	}
}

func TestFetchTotalTreatsNonAuthorizedAsNoTotal(t *testing.T) {
	client := newServer(t, func(w http.ResponseWriter, _ *http.Request) {
		_ = json.NewEncoder(w).Encode(response{XML: authorizedXML("101", otherCNPJ, "65.88")})
	})

	if cents, ok, err := client.FetchTotal(context.Background(), testKey, testQR); ok || err != nil {
		t.Errorf("cancelled receipt = %d, %v, %v; want 0, false, nil", cents, ok, err)
	}
}

func TestFetchTotalRejectsAnInconsistentXML(t *testing.T) {
	client := newServer(t, func(w http.ResponseWriter, _ *http.Request) {
		_ = json.NewEncoder(w).Encode(response{XML: authorizedXML("100", "99999999000199", "65.88")})
	})

	if _, ok, err := client.FetchTotal(context.Background(), testKey, testQR); err == nil || ok {
		t.Errorf("foreign issuer = %v, %v; want a mismatch error", ok, err)
	}
}

func TestFetchTotalReportsHTTPFailures(t *testing.T) {
	client := newServer(t, func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusBadRequest)
		_, _ = w.Write([]byte(`{"error":"INVALID_CAPTCHA"}`))
	})

	_, ok, err := client.FetchTotal(context.Background(), testKey, testQR)
	if ok || err == nil || !strings.Contains(err.Error(), "INVALID_CAPTCHA") {
		t.Errorf("bad request = %v, %v; want the portal error", ok, err)
	}
}

func TestFetchTotalTreatsAnUnknownKeyAsNoTotal(t *testing.T) {
	client := newServer(t, func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusNotFound)
		_, _ = w.Write([]byte(`{"error":"NOT_FOUND"}`))
	})

	if cents, ok, err := client.FetchTotal(context.Background(), testKey, testQR); ok || err != nil {
		t.Errorf("unknown key = %d, %v, %v; want 0, false, nil", cents, ok, err)
	}
}

func TestFetchTotalSkipsForeignStateKeys(t *testing.T) {
	var calls atomic.Int32
	client := newServer(t, func(http.ResponseWriter, *http.Request) { calls.Add(1) })

	spKey := "35261130112222000167651030000099991341146673"
	if _, ok, err := client.FetchTotal(context.Background(), spKey, spKey+"|2|1|1|abc123"); ok || err != nil {
		t.Errorf("SP key = %v, %v; want false, nil", ok, err)
	}
	if calls.Load() != 0 {
		t.Errorf("HTTP calls = %d, want 0", calls.Load())
	}
}

func TestFetchTotalHonoursRetryAfter(t *testing.T) {
	var calls atomic.Int32
	client := newServer(t, func(w http.ResponseWriter, _ *http.Request) {
		calls.Add(1)
		w.Header().Set("Retry-After", "60")
		w.WriteHeader(http.StatusTooManyRequests)
		_, _ = w.Write([]byte(`{"error":"RATE_LIMITED"}`))
	})

	if _, ok, err := client.FetchTotal(context.Background(), testKey, testQR); ok || err == nil {
		t.Fatalf("rate limited = %v, %v; want an error", ok, err)
	}
	// The portal shares 20 requests/minute per IP: the next scan must not call.
	if _, ok, _ := client.FetchTotal(context.Background(), testKey, testQR); ok {
		t.Error("second call after 429 = true, want false")
	}
	if calls.Load() != 1 {
		t.Errorf("HTTP calls = %d, want 1", calls.Load())
	}
}

func TestFetchTotalDoesNotOpenTheCircuitOnBadInput(t *testing.T) {
	var calls atomic.Int32
	client := newServer(t, func(w http.ResponseWriter, _ *http.Request) {
		calls.Add(1)
		w.WriteHeader(http.StatusBadRequest)
		_, _ = w.Write([]byte(`{"error":"INVALID_CAPTCHA"}`))
	})

	for range breakerFailures + 2 {
		_, _, _ = client.FetchTotal(context.Background(), testKey, testQR)
	}
	if calls.Load() != breakerFailures+2 {
		t.Errorf("HTTP calls = %d, want every attempt (a 400 is our input, not an outage)", calls.Load())
	}
}

func TestFetchTotalNormalizesACouponWithoutHash(t *testing.T) {
	// Real Centauro coupon: p=chave|3|1, no hash at all.
	var got request
	client := newServer(t, func(w http.ResponseWriter, r *http.Request) {
		_ = json.NewDecoder(r.Body).Decode(&got)
		_ = json.NewEncoder(w).Encode(response{XML: authorizedXML("100", otherCNPJ, "65.88")})
	})

	cents, ok, err := client.FetchTotal(context.Background(), testKey, testKey+"|3|1")
	if !ok || err != nil || cents != 6588 {
		t.Fatalf("FetchTotal(v3) = %d, %v, %v; want 6588, true, nil", cents, ok, err)
	}
	if want := testKey + "|3|1|1|" + strings.Repeat("0", 40); got.QRParam != want {
		t.Errorf("qrCodeParam = %q, want %q", got.QRParam, want)
	}
}

func TestNormalizeQR(t *testing.T) {
	hash := strings.Repeat("a", 40)
	zeros := strings.Repeat("0", 40)
	cases := map[string]string{
		// Leitura (v2): hash de 40 com "%5D" colado.
		testKey + "|2|1|1|" + hash + "%5D": testKey + "|2|1|1|" + hash,
		// Centauro (v3): só chave|versao|tpAmb.
		testKey + "|3|1": testKey + "|3|1|1|" + zeros,
		// URL do portal com os pipes percent-encoded.
		testKey + "%7C2%7C1%7C1%7C" + hash: testKey + "|2|1|1|" + hash,
		// v1: sem tpAmb.
		testKey + "|2":                    testKey + "|2|1|1|" + zeros,
		testKey + "|2|1|1|" + hash:        testKey + "|2|1|1|" + hash,
		testKey + "|2|1|1|" + hash + "|x": testKey + "|2|1|1|" + hash,
	}
	for input, want := range cases {
		if got := normalizeQR(input); got != want {
			t.Errorf("normalizeQR(%q) = %q, want %q", input, got, want)
		}
	}
}

func TestFetchTotalSendsTheNormalizedPayload(t *testing.T) {
	var got request
	client := newServer(t, func(w http.ResponseWriter, r *http.Request) {
		_ = json.NewDecoder(r.Body).Decode(&got)
		_ = json.NewEncoder(w).Encode(response{XML: authorizedXML("100", otherCNPJ, "65.88")})
	})

	hash := strings.Repeat("b", 40)
	if _, ok, err := client.FetchTotal(context.Background(), testKey, testKey+"|2|1|1|"+hash+"%0A"); !ok || err != nil {
		t.Fatalf("FetchTotal() = %v, %v; want the total", ok, err)
	}
	if want := testKey + "|2|1|1|" + hash; got.QRParam != want {
		t.Errorf("qrCodeParam = %q, want %q", got.QRParam, want)
	}
}

func TestFetchTotalStopsCallingAfterRepeatedFailures(t *testing.T) {
	var calls atomic.Int32
	client := newServer(t, func(w http.ResponseWriter, _ *http.Request) {
		calls.Add(1)
		w.WriteHeader(http.StatusInternalServerError)
	})

	for range breakerFailures + 2 {
		_, _, _ = client.FetchTotal(context.Background(), testKey, testQR)
	}
	if calls.Load() != breakerFailures {
		t.Errorf("HTTP calls = %d, want %d (circuit open)", calls.Load(), breakerFailures)
	}
}

func TestParseCents(t *testing.T) {
	cases := map[string]int64{"65.88": 6588, "0.05": 5, "12": 1200, "12.4": 1240, "1234.00": 123400}
	for input, want := range cases {
		got, err := parseCents(input)
		if err != nil || got != want {
			t.Errorf("parseCents(%q) = %d, %v; want %d", input, got, err, want)
		}
	}
	for _, invalid := range []string{"", "abc", "-1.00", "1.2.3"} {
		if _, err := parseCents(invalid); err == nil {
			t.Errorf("parseCents(%q) accepted an invalid total", invalid)
		}
	}
}
