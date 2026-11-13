package httpapi

import (
	"net/http"
	"os"

	"github.com/marcioecom/raiz/apps/api/internal/config"
)

// contractPath resolves docs/openapi.yaml on disk, both in local dev (run from
// apps/api) and in the container.
func contractPath(cfg config.Config) string {
	candidates := make([]string, 0, 6)
	if cfg.ContractPath != "" {
		candidates = append(candidates, cfg.ContractPath)
	}
	candidates = append(candidates,
		"../../docs/openapi.yaml",
		"../docs/openapi.yaml",
		"docs/openapi.yaml",
	)

	for _, candidate := range candidates {
		if info, err := os.Stat(candidate); err == nil && !info.IsDir() {
			return candidate
		}
	}
	return ""
}

func openAPIFile(path string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if path == "" {
			writeError(w, http.StatusNotFound, "contract_not_found",
				"docs/openapi.yaml was not found on the server", nil)
			return
		}
		body, err := os.ReadFile(path)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "contract_unreadable",
				"could not read the contract", nil)
			return
		}
		w.Header().Set("Content-Type", "application/yaml; charset=utf-8")
		w.Header().Set("Cache-Control", "no-store")
		_, _ = w.Write(body)
	}
}

// docsPage serves the interactive reference (Scalar) pointing at /openapi.yaml.
func docsPage() http.HandlerFunc {
	const page = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Raiz · API</title>
</head>
<body>
  <script id="api-reference" data-url="/openapi.yaml"></script>
  <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
  <noscript>Raw contract at <a href="/openapi.yaml">/openapi.yaml</a>.</noscript>
</body>
</html>`

	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		w.Header().Set("Cache-Control", "no-store")
		_, _ = w.Write([]byte(page))
	}
}
