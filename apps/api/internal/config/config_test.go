package config

import (
	"testing"
)

func setValidEnv(t *testing.T) {
	t.Helper()
	t.Setenv("DATABASE_URL", "postgres://raiz:raiz@localhost:5432/raiz?sslmode=disable")
	t.Setenv("JWT_SECRET", "a-secret-long-enough-to-pass")
	t.Setenv("PII_KEY", "a-pii-key-long-enough-to-pass-32ch")
}

func TestLoadAppliesDefaults(t *testing.T) {
	setValidEnv(t)

	cfg, err := Load()
	if err != nil {
		t.Fatalf("Load() error: %v", err)
	}
	if cfg.Env != "development" {
		t.Errorf("Env = %q, want development", cfg.Env)
	}
	if cfg.Addr != ":8080" {
		t.Errorf("Addr = %q, want :8080", cfg.Addr)
	}
	if !cfg.DemoMode {
		t.Error("DemoMode should default to true")
	}
	if len(cfg.AllowedOrigins) != 1 || cfg.AllowedOrigins[0] != "*" {
		t.Errorf("AllowedOrigins = %v, want [*]", cfg.AllowedOrigins)
	}
}

func TestLoadRequiresDatabaseURL(t *testing.T) {
	setValidEnv(t)
	t.Setenv("DATABASE_URL", "")

	if _, err := Load(); err == nil {
		t.Fatal("Load() should fail without DATABASE_URL")
	}
}

func TestLoadRequiresLongJWTSecret(t *testing.T) {
	setValidEnv(t)
	t.Setenv("JWT_SECRET", "short")

	if _, err := Load(); err == nil {
		t.Fatal("Load() should reject a JWT secret shorter than 16 characters")
	}
}

func TestLoadRequiresLongPIIKey(t *testing.T) {
	setValidEnv(t)

	for _, key := range []string{"", "too-short-to-derive-aes-256"} {
		t.Setenv("PII_KEY", key)
		if _, err := Load(); err == nil {
			t.Fatalf("Load() should reject PII_KEY %q", key)
		}
	}
}

func TestLoadRejectsUnknownEnv(t *testing.T) {
	setValidEnv(t)
	t.Setenv("ENV", "staging")

	if _, err := Load(); err == nil {
		t.Fatal("Load() should reject an unknown ENV")
	}
}

func TestLoadParsesOriginsAndLevel(t *testing.T) {
	setValidEnv(t)
	t.Setenv("ALLOWED_ORIGINS", "https://raiz.app, https://www.raiz.app ,")
	t.Setenv("LOG_LEVEL", "warn")

	cfg, err := Load()
	if err != nil {
		t.Fatalf("Load() error: %v", err)
	}
	if len(cfg.AllowedOrigins) != 2 {
		t.Fatalf("AllowedOrigins = %v, want 2 entries", cfg.AllowedOrigins)
	}
	if cfg.Level().String() != "WARN" {
		t.Errorf("Level() = %s, want WARN", cfg.Level())
	}
}

func TestLoadDatabaseURLOnlyNeedsDSN(t *testing.T) {
	t.Setenv("DATABASE_URL", "postgres://raiz:raiz@localhost:5432/raiz?sslmode=disable")
	t.Setenv("JWT_SECRET", "")

	dsn, err := LoadDatabaseURL()
	if err != nil {
		t.Fatalf("LoadDatabaseURL() error: %v", err)
	}
	if dsn == "" {
		t.Fatal("dsn is empty")
	}

	t.Setenv("DATABASE_URL", "")
	if _, err := LoadDatabaseURL(); err == nil {
		t.Fatal("LoadDatabaseURL() should fail without DATABASE_URL")
	}
}
