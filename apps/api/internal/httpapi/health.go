package httpapi

import (
	"context"
	"log/slog"
	"net/http"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/marcioecom/raiz/apps/api/internal/config"
)

// healthz is what the deploy probes: if the database does not answer, the API
// reports itself as unhealthy instead of pretending otherwise.
func healthz(cfg config.Config, pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
		defer cancel()

		status, overall, database := http.StatusOK, "ok", "ok"
		if err := pool.Ping(ctx); err != nil {
			status, overall, database = http.StatusServiceUnavailable, "degraded", "unavailable"
			slog.Warn("healthz: database unavailable", "err", err)
		}

		writeJSON(w, status, map[string]any{
			"status":    overall,
			"service":   "raiz-api",
			"version":   Version,
			"env":       cfg.Env,
			"demo_mode": cfg.DemoMode,
			"checks":    map[string]string{"database": database},
			"time":      time.Now().UTC().Format(time.RFC3339),
		})
	}
}

// meta gives the frontend something real to consume before the feature
// endpoints exist.
func meta(cfg config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, map[string]any{
			"service":   "raiz-api",
			"version":   Version,
			"env":       cfg.Env,
			"demo_mode": cfg.DemoMode,
			"docs":      "/docs",
			"contract":  "/openapi.yaml",
		})
	}
}
