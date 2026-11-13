package receipt

import "time"

// IssuedAt approximates the emission instant of the receipt. The access key
// only carries the year and month, so the best local estimate is the last
// instant of that month, capped at now (a receipt cannot be issued in the
// future). This keeps the 72h window and the daily counters honest without
// making the visitor lose a valid coupon; the SEFAZ enrichment can refine it
// later.
func IssuedAt(k AccessKey, now time.Time) time.Time {
	end := k.YearMonth.AddDate(0, 1, 0).Add(-time.Second)
	if end.After(now) {
		return now.UTC()
	}
	return end.UTC()
}
