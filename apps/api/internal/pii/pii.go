// Package pii holds the phone handling required by LGPD: normalization, a
// keyed hash for lookup and AES-256-GCM for the value shown back to the
// visitor. The phone is never logged and never stored in clear text.
package pii

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"fmt"
	"strings"
)

// MinKeyLen mirrors the PII_KEY validation in config.
const MinKeyLen = 32

// ErrInvalidPhone rejects anything that is not a 10 or 11 digit Brazilian
// number with area code.
var ErrInvalidPhone = errors.New("phone must have 10 or 11 digits including the area code")

// Vault derives every PII key from the single PII_KEY secret.
type Vault struct {
	hashKey []byte
	aead    cipher.AEAD
}

func NewVault(secret string) (*Vault, error) {
	if len(secret) < MinKeyLen {
		return nil, fmt.Errorf("PII_KEY must have at least %d characters", MinKeyLen)
	}

	block, err := aes.NewCipher(derive(secret, "aes"))
	if err != nil {
		return nil, fmt.Errorf("creating cipher: %w", err)
	}
	aead, err := cipher.NewGCM(block)
	if err != nil {
		return nil, fmt.Errorf("creating gcm: %w", err)
	}
	return &Vault{hashKey: derive(secret, "hash"), aead: aead}, nil
}

// Hash is the HMAC-SHA256 hex digest used for phone_hash and for the OTP
// code_hash: the same key, different inputs, so a leaked hash does not reveal
// the value.
func (v *Vault) Hash(value string) string {
	mac := hmac.New(sha256.New, v.hashKey)
	mac.Write([]byte(value))
	return hex.EncodeToString(mac.Sum(nil))
}

// Encrypt returns base64(nonce||ciphertext) for phone_enc.
func (v *Vault) Encrypt(phone string) (string, error) {
	nonce := make([]byte, v.aead.NonceSize())
	if _, err := rand.Read(nonce); err != nil {
		return "", fmt.Errorf("generating nonce: %w", err)
	}
	sealed := v.aead.Seal(nonce, nonce, []byte(phone), nil)
	return base64.StdEncoding.EncodeToString(sealed), nil
}

func (v *Vault) Decrypt(encoded string) (string, error) {
	raw, err := base64.StdEncoding.DecodeString(encoded)
	if err != nil {
		return "", fmt.Errorf("decoding phone_enc: %w", err)
	}
	size := v.aead.NonceSize()
	if len(raw) < size {
		return "", errors.New("phone_enc is too short")
	}
	plain, err := v.aead.Open(nil, raw[:size], raw[size:], nil)
	if err != nil {
		return "", fmt.Errorf("decrypting phone_enc: %w", err)
	}
	return string(plain), nil
}

// NormalizePhone keeps the digits and requires an area code (10 or 11 digits).
func NormalizePhone(raw string) (string, error) {
	var b strings.Builder
	b.Grow(len(raw))
	for _, r := range raw {
		if r >= '0' && r <= '9' {
			b.WriteRune(r)
		}
	}
	digits := b.String()
	if len(digits) != 10 && len(digits) != 11 {
		return "", ErrInvalidPhone
	}
	return digits, nil
}

// Mask formats a normalized phone for display, e.g. "(63) 9****-1234".
func Mask(phone string) string {
	switch len(phone) {
	case 11:
		return fmt.Sprintf("(%s) %s****-%s", phone[0:2], phone[2:3], phone[7:11])
	case 10:
		return fmt.Sprintf("(%s) ****-%s", phone[0:2], phone[6:10])
	default:
		return ""
	}
}

// derive separates the hash key from the AES key so one secret seeds both.
func derive(secret, label string) []byte {
	sum := sha256.Sum256([]byte("raiz/pii/" + label + ":" + secret))
	return sum[:]
}
