package httpapi

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"os"
	"strings"

	"github.com/marcioecom/raiz/apps/api/internal/config"
)

// scalarVersion is pinned on purpose: the CDN serves "latest" by default, and a
// docs page that changes under us during the demo is a needless risk.
const scalarVersion = "1.78.1"

// contractPath resolves docs/openapi.yaml on disk, both in local dev (run from
// apps/api) and in the container (WORKDIR /app).
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

// docsPage serves the reference with the contract embedded in the page.
//
// Loading the spec from /openapi.yaml looked simpler, but it makes the docs
// depend on a second browser request (and its CORS/worker failure modes). With
// content inlined, opening /docs is a single request that always renders.
func docsPage(contract string) http.HandlerFunc {
	page := renderDocs(contract)
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		w.Header().Set("Cache-Control", "no-store")
		_, _ = w.Write(page)
	}
}

func renderDocs(contract string) []byte {
	spec := ""
	if contract != "" {
		body, err := os.ReadFile(contract)
		if err != nil {
			slog.Warn("docs: could not read contract", "path", contract, "err", err)
		} else {
			spec = string(body)
		}
	}

	// json.Marshal escapes "<", ">" and "&", so the spec can never break out of
	// the script tag.
	quoted, err := json.Marshal(spec)
	if err != nil {
		quoted = []byte(`""`)
	}

	return []byte(strings.Replace(docsTemplate, "{{SPEC}}", string(quoted), 1))
}

const docsTemplate = `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="icon" href="data:,">
  <title>Raiz · API</title>
  <style>
    body { margin: 0; font-family: system-ui, sans-serif; }
    .fallback { padding: 10px 16px; font-size: 13px; color: #555; border-top: 1px solid #eee; }
    .fallback a { color: #1f3a2e; }
  </style>
</head>
<body>
  <div id="app"></div>
  <p class="fallback" id="fallback">
    Contrato bruto: <a href="/openapi.yaml">/openapi.yaml</a> ·
    saúde: <a href="/healthz">/healthz</a>
  </p>
  <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference@` + scalarVersion + `"></script>
  <script>
    (function () {
      var spec = {{SPEC}};
      var note = document.getElementById('fallback');
      if (!spec) {
        note.textContent = 'Contrato indisponível no servidor.';
        return;
      }
      if (!window.Scalar || typeof window.Scalar.createApiReference !== 'function') {
        note.textContent = 'Falha ao carregar a interface de documentação. O contrato segue disponível em /openapi.yaml.';
        return;
      }
      window.Scalar.createApiReference('#app', { content: spec });
    })();
  </script>
</body>
</html>`
