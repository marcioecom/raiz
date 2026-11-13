package receipt

import (
	"errors"
	"testing"
	"time"
)

// Fixtures whose check digits were computed outside the Go code.
const (
	validTO       = "17260112345678000199650010000001231123456787"
	validSP       = "35251060746948000112650020000000451876543219"
	validModelNFe = "17260112345678000199550010000001231123456784"
	invalidDV     = "17260112345678000199650010000001231123456788"
	invalidMonth  = "17261312345678000199650010000001231123456787"
	invalidUF     = "99260112345678000199650010000001231123456782"
	invalidModel  = "17260112345678000199990010000001231123456780"
)

func TestParseValid(t *testing.T) {
	cases := []struct {
		name string
		in   string
		want AccessKey
	}{
		{
			name: "raw 44 digits",
			in:   validTO,
			want: AccessKey{UF: "17", UFName: "TO", CNPJ: "12345678000199", Model: 65, Series: 1, Number: 123, EmissionType: 1, RandomCode: "12345678"},
		},
		{
			name: "with separators",
			in:   "1726 0112.3456-7800 0199 6500 1000 0001 2311 2345 6787",
			want: AccessKey{UF: "17", UFName: "TO", CNPJ: "12345678000199", Model: 65},
		},
		{
			name: "NFC-e QR content",
			in:   "https://www.sefaz.to.gov.br/nfce/qrcode?p=" + validTO + "|2|1|1|ABCDEF",
			want: AccessKey{UF: "17", UFName: "TO", CNPJ: "12345678000199", Model: 65},
		},
		{
			name: "another state",
			in:   validSP,
			want: AccessKey{UF: "35", UFName: "SP", CNPJ: "60746948000112", Model: 65, Series: 2, Number: 45, RandomCode: "87654321"},
		},
		{
			name: "NF-e model 55 is accepted too",
			in:   validModelNFe,
			want: AccessKey{UF: "17", UFName: "TO", Model: 55, CNPJ: "12345678000199"},
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got, err := Parse(tc.in)
			if err != nil {
				t.Fatalf("Parse() unexpected error: %v", err)
			}
			if got.UF != tc.want.UF || got.UFName != tc.want.UFName || got.CNPJ != tc.want.CNPJ || got.Model != tc.want.Model {
				t.Fatalf("Parse() = %+v, want %+v", got, tc.want)
			}
			if tc.want.Series != 0 && got.Series != tc.want.Series {
				t.Errorf("Series = %d, want %d", got.Series, tc.want.Series)
			}
			if tc.want.Number != 0 && got.Number != tc.want.Number {
				t.Errorf("Number = %d, want %d", got.Number, tc.want.Number)
			}
			if tc.want.RandomCode != "" && got.RandomCode != tc.want.RandomCode {
				t.Errorf("RandomCode = %s, want %s", got.RandomCode, tc.want.RandomCode)
			}
			if got.Raw != normalizedKey(tc.in) {
				t.Errorf("Raw = %s, want the normalized 44 digits", got.Raw)
			}
		})
	}
}

func TestParseYearMonth(t *testing.T) {
	got, err := Parse(validTO)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	want := time.Date(2026, time.January, 1, 0, 0, 0, 0, time.UTC)
	if !got.YearMonth.Equal(want) {
		t.Fatalf("YearMonth = %s, want %s", got.YearMonth, want)
	}
}

func TestParseInvalid(t *testing.T) {
	cases := []struct {
		name     string
		in       string
		wantCode string
	}{
		{"empty", "", "empty_access_key"},
		{"too short", "123", "invalid_length"},
		{"too long", validTO + "0", "invalid_length"},
		{"with letters", "1726011234567800019965001000000123112345678a", "invalid_chars"},
		{"wrong check digit", invalidDV, "invalid_check_digit"},
		{"month 13", invalidMonth, "invalid_month"},
		{"unknown state", invalidUF, "invalid_uf"},
		{"unknown model", invalidModel, "invalid_model"},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			_, err := Parse(tc.in)
			if err == nil {
				t.Fatal("Parse() should fail")
			}
			var ce *CodeError
			if !errors.As(err, &ce) {
				t.Fatalf("error is not a CodeError: %T", err)
			}
			if ce.Code != tc.wantCode {
				t.Fatalf("code = %q, want %q (%v)", ce.Code, tc.wantCode, err)
			}
		})
	}
}

// TestCheckDigitKnownValues proves the algorithm against values computed
// outside the Go code: if someone "optimizes" the function, this breaks.
func TestCheckDigitKnownValues(t *testing.T) {
	cases := map[string]int{
		validTO[:43]:       7,
		validSP[:43]:       9,
		validModelNFe[:43]: 4,
		realTO[:43]:        7,
	}
	for base, want := range cases {
		if got := checkDigit(base); got != want {
			t.Errorf("checkDigit(%s) = %d, want %d", base, got, want)
		}
	}
}

// Fixtures read from real Capim Dourado receipts.
const (
	// Rebuilt from the CNPJ printed on the receipt (06347409018889, TO, NFC-e):
	// the check digit matches, so the key is authentic.
	realTO = "17261106347409018889651210001017301655128527"
	// Typed by hand from a photo of another receipt: one digit was misread and
	// the modulo 11 check digit is exactly what catches it.
	realMistyped = "17261122582843000186650540001593311000056146"
)

func TestParseRealReceipts(t *testing.T) {
	key, err := Parse(realTO)
	if err != nil {
		t.Fatalf("Parse(realTO) error: %v", err)
	}
	want := AccessKey{UF: "17", UFName: "TO", CNPJ: "06347409018889", Model: 65, Series: 121, Number: 101730, EmissionType: 1}
	if key.UF != want.UF || key.UFName != want.UFName || key.CNPJ != want.CNPJ || key.Model != want.Model ||
		key.Series != want.Series || key.Number != want.Number || key.EmissionType != want.EmissionType {
		t.Fatalf("Parse(realTO) = %+v, want %+v", key, want)
	}
	if wantMonth := time.Date(2026, time.November, 1, 0, 0, 0, 0, time.UTC); !key.YearMonth.Equal(wantMonth) {
		t.Errorf("YearMonth = %s, want %s", key.YearMonth, wantMonth)
	}

	_, err = Parse(realMistyped)
	var ce *CodeError
	if !errors.As(err, &ce) {
		t.Fatalf("Parse(realMistyped) error = %v, want a CodeError", err)
	}
	if ce.Code != "invalid_check_digit" {
		t.Fatalf("Parse(realMistyped) code = %q, want invalid_check_digit", ce.Code)
	}
}

func normalizedKey(in string) string {
	key, err := extractKey(in)
	if err != nil {
		panic(err)
	}
	return key
}
