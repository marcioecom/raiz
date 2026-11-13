// Package auth issues and verifies the visitor session token (JWT HS256).
package auth

import (
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

const (
	// Issuer is the `iss` claim every Raiz token carries.
	Issuer = "raiz-api"
	// TTL is the session lifetime documented in the contract: 30 days.
	TTL = 30 * 24 * time.Hour
)

var ErrInvalidToken = errors.New("invalid token")

// Signer wraps the shared secret; it is safe for concurrent use.
type Signer struct {
	key []byte
}

func NewSigner(secret string) *Signer {
	return &Signer{key: []byte(secret)}
}

// Issue returns a signed token for the visitor and its expiry.
func (s *Signer) Issue(visitorID string) (string, time.Time, error) {
	now := time.Now().UTC()
	expiresAt := now.Add(TTL)

	claims := jwt.RegisteredClaims{
		Subject:   visitorID,
		Issuer:    Issuer,
		IssuedAt:  jwt.NewNumericDate(now),
		ExpiresAt: jwt.NewNumericDate(expiresAt),
	}
	signed, err := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(s.key)
	if err != nil {
		return "", time.Time{}, fmt.Errorf("signing token: %w", err)
	}
	return signed, expiresAt, nil
}

// Parse validates signature, issuer and expiry, and returns the visitor id.
func (s *Signer) Parse(raw string) (string, error) {
	claims := &jwt.RegisteredClaims{}
	_, err := jwt.ParseWithClaims(raw, claims, func(*jwt.Token) (any, error) {
		return s.key, nil
	},
		jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}),
		jwt.WithIssuer(Issuer),
		jwt.WithExpirationRequired(),
	)
	if err != nil {
		return "", fmt.Errorf("%w: %v", ErrInvalidToken, err)
	}
	if claims.Subject == "" {
		return "", ErrInvalidToken
	}
	return claims.Subject, nil
}
