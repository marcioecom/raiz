package httpapi

import (
	"log/slog"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/marcioecom/raiz/apps/api/internal/config"
	"github.com/marcioecom/raiz/apps/api/internal/store"
)

// Version ships with the contract and is reported by /healthz.
const Version = "0.1.0"

// New wires the HTTP stack. Middleware order matters: recoverer and logger are
// outermost so they see every request, including panics from inner layers.
func New(cfg config.Config, pool *pgxpool.Pool, log *slog.Logger) (http.Handler, error) {
	handlers, err := newAPI(cfg, store.New(pool), log)
	if err != nil {
		return nil, err
	}

	r := chi.NewRouter()

	r.Use(middleware.RequestID)
	r.Use(recoverer(log))
	r.Use(requestLogger(log))
	r.Use(middleware.CleanPath)
	r.Use(middleware.GetHead)
	r.Use(middleware.Compress(5))
	r.Use(middleware.Timeout(15 * time.Second))
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins: cfg.AllowedOrigins,
		AllowedMethods: []string{http.MethodGet, http.MethodPost, http.MethodDelete, http.MethodOptions},
		AllowedHeaders: []string{"Accept", "Authorization", "Content-Type", "Idempotency-Key"},
		MaxAge:         600,
	}))

	r.Get("/healthz", healthz(cfg, pool))
	r.Get("/docs", docsPage())
	r.Get("/openapi.yaml", openAPIFile(contractPath(cfg)))

	r.Route("/v1", func(r chi.Router) {
		// API responses are never cacheable; the seed is demo data.
		r.Use(middleware.NoCache)
		r.Use(middleware.RequestSize(1 << 20))

		handlers.mount(r)
	})

	r.NotFound(notFound)
	r.MethodNotAllowed(methodNotAllowed)

	return r, nil
}
