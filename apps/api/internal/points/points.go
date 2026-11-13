// Package points holds the scoring, antifraud and mission rules. Everything
// here is a pure function: no database, no clock, so the rules are tested
// directly.
package points

import (
	"slices"
	"time"
)

const (
	// BaseReceipt is the value of any accepted receipt.
	BaseReceipt = 10
	// ReceiptWindow is the maximum age of an accepted receipt.
	ReceiptWindow = 72 * time.Hour
	// MaxReceiptsPerDay is the daily ceiling per visitor.
	MaxReceiptsPerDay = 5
	// HistoryWindow is how far back mission rules look (7 days, the store
	// mission window).
	HistoryWindow = 7 * 24 * time.Hour
)

// RuleError carries the snake_case code documented for the error envelope.
type RuleError struct {
	Code    string
	Message string
}

func (e *RuleError) Error() string { return e.Message }

var (
	ErrTooOld            = &RuleError{"receipt_too_old", "receipt was issued more than 72 hours ago"}
	ErrStoreDailyLimit   = &RuleError{"store_daily_limit", "only one receipt per store per day"}
	ErrDailyLimitReached = &RuleError{"daily_limit_reached", "at most five receipts per day"}
)

// ReceiptPoints is the base value plus one seed per full real spent.
func ReceiptPoints(totalCents int64) int {
	return BaseReceipt + int(totalCents/100)
}

// CheckReceipt applies the antifraud rules in their documented order. The
// counters are computed for the receipt issue day, not for the scan day.
func CheckReceipt(issuedAt, now time.Time, sameStoreToday, today int) error {
	if now.Sub(issuedAt) > ReceiptWindow {
		return ErrTooOld
	}
	if sameStoreToday > 0 {
		return ErrStoreDailyLimit
	}
	if today >= MaxReceiptsPerDay {
		return ErrDailyLimitReached
	}
	return nil
}

// Supported mission rule types. The reminder of the enum (rhythm,
// first_receipt, referral) lands in its own block and is ignored here.
const (
	RuleStores   = "stores"
	RuleCategory = "category"
)

// Mission is an active mission definition.
type Mission struct {
	ID           string
	Title        string
	RuleType     string
	Target       int
	RewardPoints int
	// Categories narrows a category mission to the listed categories. Empty
	// means any distinct category.
	Categories []string
}

// ReceiptFact is the part of a stored receipt a mission rule needs.
type ReceiptFact struct {
	StoreKey string // store CNPJ; empty when the store is unknown
	Category string
	IssuedAt time.Time
}

// Advancement is one mission touched by a receipt. PointsAwarded is filled by
// the caller with what the ledger actually credited.
type Advancement struct {
	MissionID     string `json:"mission_id"`
	Title         string `json:"title"`
	Progress      int    `json:"progress"`
	Target        int    `json:"target"`
	Completed     bool   `json:"completed"`
	PointsAwarded int    `json:"points_awarded"`
	RewardPoints  int    `json:"-"`
}

// Advance evaluates the supported rules against the receipt history. Windows
// are anchored on now, the scan time, because the access key carries only the
// year and month of the issue. Already completed missions must be filtered out
// by the caller.
func Advance(missions []Mission, history []ReceiptFact, now time.Time) []Advancement {
	advanced := make([]Advancement, 0, len(missions))
	weekStart := isoWeekStart(now)

	for _, m := range missions {
		var progress int
		switch m.RuleType {
		case RuleStores:
			progress = countDistinct(history, now.Add(-HistoryWindow), now, func(f ReceiptFact) string {
				return f.StoreKey
			})
		case RuleCategory:
			progress = countDistinct(history, weekStart, now, func(f ReceiptFact) string {
				// A mission that names its categories only counts those: a
				// livraria + esportes week does not complete alimentação + moda.
				if len(m.Categories) > 0 && !slices.Contains(m.Categories, f.Category) {
					return ""
				}
				return f.Category
			})
		default:
			continue
		}
		if progress == 0 {
			continue
		}
		if progress > m.Target {
			progress = m.Target
		}

		a := Advancement{
			MissionID:    m.ID,
			Title:        m.Title,
			Progress:     progress,
			Target:       m.Target,
			Completed:    progress >= m.Target,
			RewardPoints: m.RewardPoints,
		}
		if a.Completed {
			a.PointsAwarded = m.RewardPoints
		}
		advanced = append(advanced, a)
	}
	return advanced
}

func countDistinct(history []ReceiptFact, from, to time.Time, key func(ReceiptFact) string) int {
	seen := make(map[string]struct{}, len(history))
	for _, f := range history {
		if f.IssuedAt.Before(from) || f.IssuedAt.After(to) {
			continue
		}
		if k := key(f); k != "" {
			seen[k] = struct{}{}
		}
	}
	return len(seen)
}

// isoWeekStart is Monday 00:00 UTC of the week that contains t.
func isoWeekStart(t time.Time) time.Time {
	day := time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, time.UTC)
	return day.AddDate(0, 0, -((int(day.Weekday()) + 6) % 7))
}
