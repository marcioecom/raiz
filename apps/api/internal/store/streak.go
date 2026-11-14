package store

import "time"

// StreakWeeks counts consecutive ISO weeks with at least one receipt, counting
// backwards from this week (or from last week while the current one is still
// open). A broken streak only resets the count: nothing is ever subtracted.
func StreakWeeks(weeks []time.Time, now time.Time) int {
	seen := make(map[string]bool, len(weeks))
	for _, week := range weeks {
		seen[monday(week).Format(time.DateOnly)] = true
	}

	cursor := monday(now)
	if !seen[cursor.Format(time.DateOnly)] {
		// This week may not be over yet, so last week still keeps the streak.
		cursor = cursor.AddDate(0, 0, -7)
	}

	streak := 0
	for seen[cursor.Format(time.DateOnly)] {
		streak++
		cursor = cursor.AddDate(0, 0, -7)
	}
	return streak
}

// monday is the ISO week start in UTC, matching date_trunc('week', ...).
func monday(t time.Time) time.Time {
	day := time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, time.UTC)
	offset := (int(day.Weekday()) + 6) % 7
	return day.AddDate(0, 0, -offset)
}
