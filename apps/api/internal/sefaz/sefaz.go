// Package sefaz is the optional enrichment client of the receipt flow.
//
// SEFAZ-TO exposes the authorized NFC-e XML for a given access key. It requires
// the QR code payload (the "p=" query parameter printed on the coupon), because
// the hash inside it is the check the portal uses instead of a captcha. A manual
// 44-digit entry has no payload, so it simply skips the call and scores the base
// value.
package sefaz

import (
	"bytes"
	"context"
	"encoding/json"
	"encoding/xml"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/marcioecom/raiz/apps/api/internal/points"
)

// DefaultURL is the Tocantins portal. The hackathon runs in Palmas, so this is
// the only state the client covers for now.
const DefaultURL = "https://www.sefaz.to.gov.br/nfce/api/nfe"

const maxBody = 1 << 20

// Breaker tuning: after three consecutive failures the client stops calling for
// a while, so an outage costs one slow scan instead of every scan.
const (
	breakerFailures = 3
	breakerCooldown = 30 * time.Second
)

// Client implements points.TotalFetcher against the SEFAZ-TO JSON API.
type Client struct {
	url  string
	http *http.Client

	mu       sync.Mutex
	failures int
	skipTo   time.Time
}

// New returns a client with the shared 2s budget. An empty url uses DefaultURL.
func New(url string) *Client {
	if strings.TrimSpace(url) == "" {
		url = DefaultURL
	}
	return &Client{
		url:  url,
		http: &http.Client{Timeout: points.FetchTimeout},
	}
}

type request struct {
	Key     string `json:"chave"`
	Captcha string `json:"recaptchaToken"`
	QRParam string `json:"qrCodeParam"`
}

type response struct {
	XML   string `json:"xml"`
	Error string `json:"error"`
}

// nfeProc is the subset of the authorized NFC-e XML the score needs.
type nfeProc struct {
	XMLName xml.Name `xml:"nfeProc"`
	Prot    struct {
		InfProt struct {
			Key    string `xml:"chNFe"`
			Status string `xml:"cStat"`
		} `xml:"infProt"`
	} `xml:"protNFe"`
	NFe struct {
		InfNFe struct {
			Emit struct {
				CNPJ string `xml:"CNPJ"`
			} `xml:"emit"`
			Total struct {
				ICMSTot struct {
					VNF string `xml:"vNF"`
				} `xml:"ICMSTot"`
			} `xml:"total"`
		} `xml:"infNFe"`
	} `xml:"NFe"`
}

// FetchTotal returns the purchase total in cents. ok=false means "no total":
// the caller keeps the base value. A nil error with ok=false is a normal
// outcome (no QR payload, another state, cancelled receipt), never a failure to
// report.
func (c *Client) FetchTotal(ctx context.Context, accessKey, qrParam string) (int64, bool, error) {
	// The portal is Tocantins-only; a key from another state would just burn a
	// slot of the shared rate limit.
	if qrParam == "" || len(accessKey) != 44 || !strings.HasPrefix(accessKey, "17") {
		return 0, false, nil
	}
	if !c.allow() {
		return 0, false, nil
	}

	body, err := json.Marshal(request{Key: accessKey, QRParam: qrParam})
	if err != nil {
		return 0, false, fmt.Errorf("sefaz: encoding request: %w", err)
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.url, bytes.NewReader(body))
	if err != nil {
		return 0, false, fmt.Errorf("sefaz: building request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "*/*")
	req.Header.Set("Origin", "https://www.sefaz.to.gov.br")
	req.Header.Set("Referer", "https://www.sefaz.to.gov.br/")

	resp, err := c.http.Do(req)
	if err != nil {
		c.fail()
		return 0, false, fmt.Errorf("sefaz: request failed: %w", err)
	}
	defer resp.Body.Close()

	raw, err := io.ReadAll(io.LimitReader(resp.Body, maxBody))
	if err != nil {
		c.fail()
		return 0, false, fmt.Errorf("sefaz: reading response: %w", err)
	}

	var payload response
	_ = json.Unmarshal(raw, &payload)
	reason := payload.Error
	if reason == "" {
		reason = strings.TrimSpace(string(raw))
	}

	switch {
	case resp.StatusCode == http.StatusOK:
		// handled below
	case resp.StatusCode == http.StatusNotFound:
		// Unknown key: a normal outcome, not an outage.
		c.ok()
		return 0, false, nil
	case resp.StatusCode == http.StatusTooManyRequests:
		// 20 requests/minute per IP, shared by every server egress. Honour the
		// retry-after instead of retrying into the same wall.
		c.pause(retryAfter(resp.Header.Get("Retry-After")))
		return 0, false, fmt.Errorf("sefaz: rate limited: %s", reason)
	case resp.StatusCode >= http.StatusInternalServerError:
		c.fail()
		return 0, false, fmt.Errorf("sefaz: status %d: %s", resp.StatusCode, reason)
	default:
		// 400 INVALID_CHAVE / INVALID_CAPTCHA: our input, not a portal outage,
		// so it must not open the circuit.
		return 0, false, fmt.Errorf("sefaz: status %d: %s", resp.StatusCode, reason)
	}
	if payload.XML == "" {
		c.fail()
		return 0, false, errors.New("sefaz: empty xml")
	}

	// A 200 with XML means the portal is healthy, whatever the invoice says.
	c.ok()
	return parse(payload.XML, accessKey)
}

// retryAfter reads the integer seconds the portal asks us to wait.
func retryAfter(header string) time.Duration {
	seconds, err := strconv.Atoi(strings.TrimSpace(header))
	if err != nil || seconds <= 0 {
		return breakerCooldown
	}
	return time.Duration(seconds) * time.Second
}

// parse extracts the total from the authorized XML. Anything inconsistent with
// the scanned key is rejected instead of trusted.
func parse(document, accessKey string) (int64, bool, error) {
	var doc nfeProc
	if err := xml.Unmarshal([]byte(document), &doc); err != nil {
		return 0, false, fmt.Errorf("sefaz: decoding xml: %w", err)
	}
	if doc.Prot.InfProt.Key != accessKey {
		return 0, false, errors.New("sefaz: xml belongs to another access key")
	}
	// cStat 100 is "autorizado o uso da NF-e"; anything else is not a valid
	// purchase (cancelled, denied) and scores the base value.
	if doc.Prot.InfProt.Status != "100" {
		return 0, false, nil
	}
	if doc.NFe.InfNFe.Emit.CNPJ != accessKey[6:20] {
		return 0, false, errors.New("sefaz: xml issuer does not match the access key")
	}

	cents, err := parseCents(doc.NFe.InfNFe.Total.ICMSTot.VNF)
	if err != nil {
		return 0, false, err
	}
	return cents, true, nil
}

// parseCents converts the fiscal decimal string ("65.88") without floats.
func parseCents(decimal string) (int64, error) {
	whole, frac, found := strings.Cut(strings.TrimSpace(decimal), ".")
	if !found {
		frac = "00"
	}
	frac = (frac + "00")[:2]

	reais, err := strconv.ParseInt(whole, 10, 64)
	if err != nil || reais < 0 {
		return 0, fmt.Errorf("sefaz: invalid total %q", decimal)
	}
	centavos, err := strconv.ParseInt(frac, 10, 64)
	if err != nil {
		return 0, fmt.Errorf("sefaz: invalid total %q", decimal)
	}
	return reais*100 + centavos, nil
}

func (c *Client) allow() bool {
	c.mu.Lock()
	defer c.mu.Unlock()
	return !time.Now().Before(c.skipTo)
}

func (c *Client) fail() {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.failures++
	if c.failures >= breakerFailures {
		c.failures = 0
		c.skipTo = time.Now().Add(breakerCooldown)
	}
}

// pause opens the circuit immediately for an explicit cooldown (rate limit).
func (c *Client) pause(cooldown time.Duration) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.failures = 0
	c.skipTo = time.Now().Add(cooldown)
}

func (c *Client) ok() {
	c.mu.Lock()
	c.failures = 0
	c.skipTo = time.Time{}
	c.mu.Unlock()
}

var _ points.TotalFetcher = (*Client)(nil)
