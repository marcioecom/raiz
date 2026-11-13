package store

import (
	"testing"
	"time"
)

func date(year int, month time.Month, day int) time.Time {
	return time.Date(year, month, day, 12, 0, 0, 0, time.UTC)
}

func TestStreakWeeks(t *testing.T) {
	// Wednesday 2026-11-11.
	now := date(2026, time.November, 11)

	cases := []struct {
		name  string
		weeks []time.Time
		want  int
	}{
		{"no receipts", nil, 0},
		{"this week only", []time.Time{date(2026, time.November, 9)}, 1},
		{"three weeks in a row", []time.Time{
			date(2026, time.November, 9),
			date(2026, time.November, 2),
			date(2026, time.October, 26),
		}, 3},
		{"giant gap breaks the count", []time.Time{
			date(2026, time.November, 9),
			date(2026, time.November, 2),
			date(2026, time.September, 7),
		}, 2},
		{"current week empty, last week keeps it", []time.Time{
			date(2026, time.November, 2),
			date(2026, time.October, 26),
		}, 2},
		{"nothing in the last two weeks", []time.Time{date(2026, time.October, 19)}, 0},
		{"future week is ignored", []time.Time{date(2026, time.November, 16)}, 0},
		{"timestamps inside the week count", []time.Time{
			date(2026, time.November, 10),
			date(2026, time.November, 5),
		}, 2},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := StreakWeeks(tc.weeks, now); got != tc.want {
				t.Fatalf("StreakWeeks() = %d, want %d", got, tc.want)
			}
		})
	}
}
