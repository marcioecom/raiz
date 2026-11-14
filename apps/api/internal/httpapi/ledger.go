package httpapi

import (
	"encoding/base64"
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/marcioecom/raiz/apps/api/internal/store"
)

const (
	ledgerDefaultLimit = 20
	ledgerMaxLimit     = 50
)

type ledgerEntry struct {
	ID          string    `json:"id"`
	Kind        string    `json:"kind"`
	Delta       int       `json:"delta"`
	Description string    `json:"description"`
	StoreName   *string   `json:"store_name"`
	CreatedAt   time.Time `json:"created_at"`
}

type ledgerResponse struct {
	Entries    []ledgerEntry `json:"entries"`
	NextCursor *string       `json:"next_cursor"`
}

func (a *api) getLedger(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query()

	limit := ledgerDefaultLimit
	if raw := query.Get("limit"); raw != "" {
		n, err := strconv.Atoi(raw)
		if err != nil || n <= 0 {
			writeError(w, http.StatusUnprocessableEntity, "invalid_limit",
				"limit must be a positive integer", nil)
			return
		}
		limit = min(n, ledgerMaxLimit)
	}

	var before *store.LedgerCursor
	if raw := query.Get("cursor"); raw != "" {
		cursor, err := decodeLedgerCursor(raw)
		if err != nil {
			writeError(w, http.StatusUnprocessableEntity, "invalid_cursor", "cursor is not valid", nil)
			return
		}
		before = &cursor
	}

	visitor := visitorFrom(r.Context())
	rows, err := a.store.LedgerPage(r.Context(), visitor.ID, before, limit)
	if err != nil {
		a.log.Error("ledger: loading page", "err", err)
		writeError(w, http.StatusInternalServerError, "internal_error", "internal error", nil)
		return
	}

	entries := make([]ledgerEntry, 0, len(rows))
	for _, row := range rows {
		entries = append(entries, ledgerEntry{
			ID:          row.ID,
			Kind:        row.Kind,
			Delta:       row.Delta,
			Description: ledgerDescription(row),
			StoreName:   row.StoreName,
			CreatedAt:   row.CreatedAt.UTC(),
		})
	}

	var next *string
	if len(rows) == limit {
		last := rows[len(rows)-1]
		cursor := encodeLedgerCursor(store.LedgerCursor{CreatedAt: last.CreatedAt, ID: last.ID})
		next = &cursor
	}

	writeJSON(w, http.StatusOK, ledgerResponse{Entries: entries, NextCursor: next})
}

// ledgerDescription is copy the visitor reads, so it stays in pt-BR.
func ledgerDescription(row store.LedgerRow) string {
	switch row.Kind {
	case "receipt":
		if row.StoreName != nil {
			return "Cupom em " + *row.StoreName
		}
		return "Cupom registrado"
	case "mission":
		if row.MissionTitle != nil {
			return "Missão concluída: " + *row.MissionTitle
		}
		return "Missão concluída"
	case "rhythm":
		return "Ritmo completo"
	case "referral":
		return "Indicação"
	case "redeem":
		return "Resgate de prêmio"
	default:
		return "Ajuste de sementes"
	}
}

// The cursor is opaque on purpose: it is the (created_at, id) keyset position,
// so a new entry never shifts the pages the visitor is reading.
func encodeLedgerCursor(cursor store.LedgerCursor) string {
	raw := cursor.CreatedAt.UTC().Format(time.RFC3339Nano) + "|" + cursor.ID
	return base64.RawURLEncoding.EncodeToString([]byte(raw))
}

func decodeLedgerCursor(encoded string) (store.LedgerCursor, error) {
	raw, err := base64.RawURLEncoding.DecodeString(encoded)
	if err != nil {
		return store.LedgerCursor{}, err
	}
	at, id, ok := strings.Cut(string(raw), "|")
	if !ok {
		return store.LedgerCursor{}, errors.New("malformed cursor")
	}
	createdAt, err := time.Parse(time.RFC3339Nano, at)
	if err != nil {
		return store.LedgerCursor{}, err
	}
	// A shape check keeps a crafted cursor from reaching the uuid cast.
	if !isUUID(id) {
		return store.LedgerCursor{}, errors.New("malformed cursor id")
	}
	return store.LedgerCursor{CreatedAt: createdAt, ID: id}, nil
}

func isUUID(s string) bool {
	if len(s) != 36 {
		return false
	}
	for i, r := range s {
		switch i {
		case 8, 13, 18, 23:
			if r != '-' {
				return false
			}
		default:
			isHex := (r >= '0' && r <= '9') || (r >= 'a' && r <= 'f') || (r >= 'A' && r <= 'F')
			if !isHex {
				return false
			}
		}
	}
	return true
}
