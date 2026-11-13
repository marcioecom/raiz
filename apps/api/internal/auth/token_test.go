package auth

import (
	"errors"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

const secret = "test-secret-long-enough-for-hs256"

func TestIssueAndParse(t *testing.T) {
	s := NewSigner(secret)

	token, expiresAt, err := s.Issue("8f14e45f-ceea-4b0b-9f0e-1b2c3d4e5f60")
	if err != nil {
		t.Fatalf("Issue() error: %v", err)
	}

	if got, want := time.Until(expiresAt), TTL; got > want || got < want-time.Minute {
		t.Fatalf("expiresAt is %s away, want about %s", got, want)
	}

	subject, err := s.Parse(token)
	if err != nil {
		t.Fatalf("Parse() error: %v", err)
	}
	if subject != "8f14e45f-ceea-4b0b-9f0e-1b2c3d4e5f60" {
		t.Fatalf("subject = %q, want the visitor id", subject)
	}

	claims := &jwt.RegisteredClaims{}
	if _, _, err := jwt.NewParser().ParseUnverified(token, claims); err != nil {
		t.Fatalf("ParseUnverified() error: %v", err)
	}
	if claims.Issuer != Issuer {
		t.Errorf("iss = %q, want %q", claims.Issuer, Issuer)
	}
	if claims.IssuedAt == nil {
		t.Error("iat claim is missing")
	}
}

func TestParseRejectsExpiredToken(t *testing.T) {
	s := NewSigner(secret)

	past := time.Now().UTC().Add(-time.Hour)
	expired := jwt.RegisteredClaims{
		Subject:   "8f14e45f-ceea-4b0b-9f0e-1b2c3d4e5f60",
		Issuer:    Issuer,
		IssuedAt:  jwt.NewNumericDate(past.Add(-TTL)),
		ExpiresAt: jwt.NewNumericDate(past),
	}
	token, err := jwt.NewWithClaims(jwt.SigningMethodHS256, expired).SignedString([]byte(secret))
	if err != nil {
		t.Fatalf("signing token: %v", err)
	}

	if _, err := s.Parse(token); !errors.Is(err, ErrInvalidToken) {
		t.Fatalf("Parse() error = %v, want ErrInvalidToken", err)
	}
}

func TestParseRejectsForeignSignature(t *testing.T) {
	other := NewSigner("another-secret-long-enough-for-hs256")
	token, _, err := other.Issue("8f14e45f-ceea-4b0b-9f0e-1b2c3d4e5f60")
	if err != nil {
		t.Fatalf("Issue() error: %v", err)
	}

	if _, err := NewSigner(secret).Parse(token); !errors.Is(err, ErrInvalidToken) {
		t.Fatalf("Parse() error = %v, want ErrInvalidToken", err)
	}
}

func TestParseRejectsWrongIssuerAndMethod(t *testing.T) {
	s := NewSigner(secret)

	claims := jwt.RegisteredClaims{
		Subject:   "8f14e45f-ceea-4b0b-9f0e-1b2c3d4e5f60",
		Issuer:    "somebody-else",
		IssuedAt:  jwt.NewNumericDate(time.Now().UTC()),
		ExpiresAt: jwt.NewNumericDate(time.Now().UTC().Add(time.Hour)),
	}
	token, err := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString([]byte(secret))
	if err != nil {
		t.Fatalf("signing token: %v", err)
	}
	if _, err := s.Parse(token); err == nil {
		t.Fatal("Parse() should reject a foreign issuer")
	}

	for _, raw := range []string{"", "not-a-token", "a.b.c"} {
		if _, err := s.Parse(raw); !errors.Is(err, ErrInvalidToken) {
			t.Errorf("Parse(%q) error = %v, want ErrInvalidToken", raw, err)
		}
	}
}
