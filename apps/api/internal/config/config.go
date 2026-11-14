// Package config is the single source of truth for environment configuration.
// Every variable is declared once as a struct tag; nothing reads os.Getenv
// directly. Load fails fast so a missing value never surfaces mid-request.
package config

import (
	"fmt"
	"log/slog"
	"strings"

	"github.com/caarlos0/env/v11"
	"github.com/go-playground/validator/v10"
	"github.com/joho/godotenv"
)

type Config struct {
	Env            string   `env:"ENV" envDefault:"development" validate:"oneof=development production test"`
	Addr           string   `env:"ADDR" envDefault:":8080" validate:"required"`
	DatabaseURL    string   `env:"DATABASE_URL" validate:"required,url"`
	JWTSecret      string   `env:"JWT_SECRET" validate:"required,min=16"`
	PIIKey         string   `env:"PII_KEY" validate:"required,min=32"`
	LogLevel       string   `env:"LOG_LEVEL" envDefault:"info" validate:"oneof=debug info warn error"`
	DemoMode       bool     `env:"DEMO_MODE" envDefault:"true"`
	AllowedOrigins []string `env:"ALLOWED_ORIGINS" envDefault:"*" envSeparator:","`
	ContractPath   string   `env:"CONTRACT_PATH"`
	// SefazURL is the optional TOTAL enrichment (NFC-e XML). A failure there
	// never blocks a receipt: it only falls back to the base value.
	SefazURL string `env:"SEFAZ_URL" envDefault:"https://www.sefaz.to.gov.br/nfce/api/nfe"`
	// PartnerAPIKey is optional: without it the partner API answers 404.
	PartnerAPIKey string `env:"PARTNER_API_KEY"`
}

// Load parses and validates the full configuration. A .env file is loaded only
// as a development convenience; production gets real environment variables.
func Load() (Config, error) {
	_ = godotenv.Load()

	var cfg Config
	if err := env.Parse(&cfg); err != nil {
		return Config{}, fmt.Errorf("parse environment: %w", err)
	}
	if err := validator.New().Struct(cfg); err != nil {
		return Config{}, fmt.Errorf("validate config: %w", err)
	}

	cfg.AllowedOrigins = normalizeOrigins(cfg.AllowedOrigins)
	return cfg, nil
}

// LoadDatabaseURL is the minimal contract for the migrate and seed binaries:
// they must not require JWT or HTTP settings just to touch the database.
func LoadDatabaseURL() (string, error) {
	_ = godotenv.Load()

	var raw struct {
		DatabaseURL string `env:"DATABASE_URL"`
	}
	if err := env.Parse(&raw); err != nil {
		return "", fmt.Errorf("parse environment: %w", err)
	}

	dsn := strings.TrimSpace(raw.DatabaseURL)
	if dsn == "" {
		return "", fmt.Errorf("DATABASE_URL is required")
	}
	return dsn, nil
}

func (c Config) IsProduction() bool { return c.Env == "production" }

// Level maps LOG_LEVEL to slog so call sites never parse strings.
func (c Config) Level() slog.Level {
	switch c.LogLevel {
	case "debug":
		return slog.LevelDebug
	case "warn":
		return slog.LevelWarn
	case "error":
		return slog.LevelError
	default:
		return slog.LevelInfo
	}
}

func normalizeOrigins(origins []string) []string {
	out := make([]string, 0, len(origins))
	for _, origin := range origins {
		if origin = strings.TrimSpace(origin); origin != "" {
			out = append(out, origin)
		}
	}
	return out
}
