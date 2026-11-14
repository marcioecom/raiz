// Package receipt validates and decodes the NFC-e access key printed on the
// Brazilian fiscal receipt. Everything is local: no external call is needed to
// authenticate a key.
package receipt

import (
	"fmt"
	"net/url"
	"strconv"
	"strings"
	"time"
)

const accessKeyLen = 44

// CodeError carries a stable code so the API can answer with the documented
// error envelope.
type CodeError struct {
	Code    string
	Message string
}

func (e *CodeError) Error() string { return e.Message }

func newErr(code, format string, args ...any) error {
	return &CodeError{Code: code, Message: fmt.Sprintf(format, args...)}
}

// AccessKey is the decoded access key.
type AccessKey struct {
	Raw          string
	UF           string // IBGE state code, e.g. "17"
	UFName       string // state abbreviation, e.g. "TO"
	YearMonth    time.Time
	CNPJ         string
	Model        int // 55 = NF-e, 65 = NFC-e
	Series       int
	Number       int
	EmissionType int
	RandomCode   string
}

func (k AccessKey) IsNFCE() bool { return k.Model == 65 }

// ufs maps the fiscal state code used in the key to its abbreviation.
var ufs = map[string]string{
	"11": "RO", "12": "AC", "13": "AM", "14": "RR", "15": "PA", "16": "AP", "17": "TO",
	"21": "MA", "22": "PI", "23": "CE", "24": "RN", "25": "PB", "26": "PE", "27": "AL",
	"28": "SE", "29": "BA",
	"31": "MG", "32": "ES", "33": "RJ", "35": "SP",
	"41": "PR", "42": "SC", "43": "RS",
	"50": "MS", "51": "MT", "52": "GO", "53": "DF",
}

// Parse accepts the raw 44 digits, digits with separators (space, dot, dash) or
// the full NFC-e QR content (p=key|version|...).
func Parse(input string) (AccessKey, error) {
	key, err := extractKey(input)
	if err != nil {
		return AccessKey{}, err
	}

	if got, want := int(key[43]-'0'), checkDigit(key[:43]); got != want {
		return AccessKey{}, newErr("invalid_check_digit", "check digit mismatch: expected %d, got %d", want, got)
	}

	uf := key[0:2]
	ufName, ok := ufs[uf]
	if !ok {
		return AccessKey{}, newErr("invalid_uf", "unknown state code %q", uf)
	}

	yy := atoi(key[2:4])
	mm := atoi(key[4:6])
	if mm < 1 || mm > 12 {
		return AccessKey{}, newErr("invalid_month", "invalid issue month: %02d", mm)
	}

	model := atoi(key[20:22])
	if model != 55 && model != 65 {
		return AccessKey{}, newErr("invalid_model", "document model %d is neither NF-e (55) nor NFC-e (65)", model)
	}

	emission := atoi(key[34:35])
	if emission < 1 || emission > 9 {
		return AccessKey{}, newErr("invalid_emission_type", "invalid emission type %d", emission)
	}

	return AccessKey{
		Raw:          key,
		UF:           uf,
		UFName:       ufName,
		YearMonth:    time.Date(2000+yy, time.Month(mm), 1, 0, 0, 0, 0, time.UTC),
		CNPJ:         key[6:20],
		Model:        model,
		Series:       atoi(key[22:25]),
		Number:       atoi(key[25:34]),
		EmissionType: emission,
		RandomCode:   key[35:43],
	}, nil
}

// QRParam returns the NFC-e QR payload (the "p=" value) when the scanned input
// carries one. The SEFAZ portal uses the hash inside it as its check, so manual
// 44-digit entry has no payload and returns "".
func QRParam(input string) string {
	i := strings.Index(input, "p=")
	if i < 0 {
		return ""
	}
	param := input[i+2:]
	if j := strings.Index(param, "&"); j >= 0 {
		param = param[:j]
	}
	return strings.TrimSpace(param)
}

// extractKey normalizes the input until exactly 44 digits remain.
func extractKey(input string) (string, error) {
	s := strings.TrimSpace(input)
	if s == "" {
		return "", newErr("empty_access_key", "provide the receipt access key")
	}

	// Some coupons and copies arrive percent-encoded ("%7C" for "|").
	if decoded, err := url.PathUnescape(s); err == nil {
		s = decoded
	}

	// NFC-e QR content: "...?p=KEY|VERSION|ENVIRONMENT|..."
	if i := strings.Index(s, "p="); i >= 0 {
		s = s[i+2:]
		if j := strings.IndexAny(s, "&|"); j >= 0 {
			s = s[:j]
		}
	}

	s = strings.NewReplacer(" ", "", "\t", "", "\n", "", ".", "", "-", "").Replace(s)
	if len(s) != accessKeyLen {
		return "", newErr("invalid_length", "access key must have %d digits (got %d)", accessKeyLen, len(s))
	}
	for _, r := range s {
		if r < '0' || r > '9' {
			return "", newErr("invalid_chars", "access key must contain digits only")
		}
	}
	return s, nil
}

// checkDigit computes the modulo 11 check digit (weights 2..9, right to left)
// over the first 43 digits.
func checkDigit(base string) int {
	sum, weight := 0, 2
	for i := len(base) - 1; i >= 0; i-- {
		sum += int(base[i]-'0') * weight
		weight++
		if weight > 9 {
			weight = 2
		}
	}
	if dv := 11 - sum%11; dv < 10 {
		return dv
	}
	return 0
}

func atoi(s string) int {
	n, _ := strconv.Atoi(s)
	return n
}
