package httpapi

import (
	"encoding/json"
	"log/slog"
	"net/http"
)

type errorEnvelope struct {
	Error apiError `json:"error"`
}

type apiError struct {
	Code    string `json:"code"`
	Message string `json:"message"`
	Details any    `json:"details,omitempty"`
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(payload); err != nil {
		slog.Error("failed to write json response", "err", err)
	}
}

// writeError always uses the envelope documented in docs/openapi.yaml. The
// message is English on purpose: the frontend maps `code` to pt-BR copy, so
// wording never leaks into the UI.
func writeError(w http.ResponseWriter, status int, code, message string, details any) {
	writeJSON(w, status, errorEnvelope{Error: apiError{Code: code, Message: message, Details: details}})
}

func notFound(w http.ResponseWriter, r *http.Request) {
	writeError(w, http.StatusNotFound, "not_found", "route not found", map[string]string{
		"method": r.Method,
		"path":   r.URL.Path,
	})
}

func methodNotAllowed(w http.ResponseWriter, r *http.Request) {
	writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "method not allowed for this route", nil)
}

// decodeJSON reads a bounded body and answers 422 itself when the payload is
// malformed, so handlers only deal with valid shapes.
func decodeJSON(w http.ResponseWriter, r *http.Request, dst any) bool {
	dec := json.NewDecoder(http.MaxBytesReader(w, r.Body, 16<<10))
	if err := dec.Decode(dst); err != nil {
		writeError(w, http.StatusUnprocessableEntity, "invalid_body", "invalid request body", nil)
		return false
	}
	return true
}
