package pii

import (
	"errors"
	"strings"
	"testing"
)

func newTestVault(t *testing.T) *Vault {
	t.Helper()
	v, err := NewVault(strings.Repeat("k", MinKeyLen))
	if err != nil {
		t.Fatalf("NewVault() error: %v", err)
	}
	return v
}

func TestNewVaultRejectsShortKey(t *testing.T) {
	if _, err := NewVault("short"); err == nil {
		t.Fatal("NewVault() should reject a key shorter than 32 characters")
	}
}

func TestNormalizePhone(t *testing.T) {
	valid := map[string]string{
		"63999999999":     "63999999999",
		"(63) 99999-9999": "63999999999",
		"63 3222 1234":    "6332221234",
	}
	for in, want := range valid {
		got, err := NormalizePhone(in)
		if err != nil {
			t.Fatalf("NormalizePhone(%q) error: %v", in, err)
		}
		if got != want {
			t.Errorf("NormalizePhone(%q) = %q, want %q", in, got, want)
		}
	}

	// +55 is not stripped on purpose: the contract asks for the local number.
	invalid := []string{"", "123", "123456789", "123456789012", "+5511999999999", "telefone"}
	for _, in := range invalid {
		if got, err := NormalizePhone(in); err == nil {
			t.Errorf("NormalizePhone(%q) = %q, want an error", in, got)
		} else if !errors.Is(err, ErrInvalidPhone) {
			t.Errorf("NormalizePhone(%q) error = %v, want ErrInvalidPhone", in, err)
		}
	}
}

func TestHashIsStableAndKeyed(t *testing.T) {
	v := newTestVault(t)
	phone, _ := NormalizePhone("(63) 99999-9999")

	first := v.Hash(phone)
	if first != v.Hash(phone) {
		t.Fatal("Hash() must be deterministic")
	}
	if first == phone || strings.Contains(first, phone) {
		t.Fatal("Hash() must not contain the phone")
	}
	if len(first) != 64 {
		t.Fatalf("Hash() = %d chars, want 64 hex chars", len(first))
	}

	other, err := NewVault(strings.Repeat("z", MinKeyLen))
	if err != nil {
		t.Fatalf("NewVault() error: %v", err)
	}
	if other.Hash(phone) == first {
		t.Fatal("Hash() must depend on the key")
	}
}

func TestEncryptRoundTrip(t *testing.T) {
	v := newTestVault(t)
	phone := "63999999999"

	enc, err := v.Encrypt(phone)
	if err != nil {
		t.Fatalf("Encrypt() error: %v", err)
	}
	if strings.Contains(enc, phone) {
		t.Fatal("Encrypt() must not contain the plain phone")
	}

	dec, err := v.Decrypt(enc)
	if err != nil {
		t.Fatalf("Decrypt() error: %v", err)
	}
	if dec != phone {
		t.Fatalf("Decrypt() = %q, want %q", dec, phone)
	}

	// A nonce per call: the same input never encrypts to the same value.
	again, err := v.Encrypt(phone)
	if err != nil {
		t.Fatalf("Encrypt() error: %v", err)
	}
	if again == enc {
		t.Fatal("Encrypt() must use a fresh nonce per call")
	}

	if _, err := v.Decrypt("not-base64!"); err == nil {
		t.Fatal("Decrypt() should reject garbage")
	}
	if _, err := v.Decrypt("AAAA"); err == nil {
		t.Fatal("Decrypt() should reject a truncated ciphertext")
	}
}

func TestDecryptWithOtherKeyFails(t *testing.T) {
	v := newTestVault(t)
	other, err := NewVault(strings.Repeat("z", MinKeyLen))
	if err != nil {
		t.Fatalf("NewVault() error: %v", err)
	}

	enc, err := v.Encrypt("63999999999")
	if err != nil {
		t.Fatalf("Encrypt() error: %v", err)
	}
	if _, err := other.Decrypt(enc); err == nil {
		t.Fatal("Decrypt() with another key should fail")
	}
}

func TestMask(t *testing.T) {
	cases := map[string]string{
		"63999999999": "(63) 9****-9999",
		"6332221234":  "(63) ****-1234",
		"123":         "",
	}
	for in, want := range cases {
		if got := Mask(in); got != want {
			t.Errorf("Mask(%q) = %q, want %q", in, got, want)
		}
	}
}
