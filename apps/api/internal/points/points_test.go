package points

import (
	"errors"
	"testing"
	"time"
)

func TestReceiptPoints(t *testing.T) {
	cases := []struct {
		totalCents int64
		want       int
	}{
		{0, 10},
		{99, 10},
		{100, 11},
		{4550, 55},
		{12_000, 130},
	}
	for _, tc := range cases {
		if got := ReceiptPoints(tc.totalCents); got != tc.want {
			t.Errorf("ReceiptPoints(%d) = %d, want %d", tc.totalCents, got, tc.want)
		}
	}
}

func TestCheckReceipt(t *testing.T) {
	now := time.Date(2026, 11, 13, 15, 0, 0, 0, time.UTC)

	cases := []struct {
		name      string
		issuedAt  time.Time
		sameStore int
		today     int
		want      error
	}{
		{"fresh receipt", now.Add(-time.Hour), 0, 0, nil},
		{"exactly 72h", now.Add(-ReceiptWindow), 0, 0, nil},
		{"73h old beats limits", now.Add(-73 * time.Hour), 1, 5, ErrTooOld},
		{"same store today", now.Add(-time.Hour), 1, 0, ErrStoreDailyLimit},
		{"store limit beats daily", now.Add(-time.Hour), 1, 5, ErrStoreDailyLimit},
		{"fifth receipt of the day", now.Add(-time.Hour), 0, 4, nil},
		{"sixth receipt of the day", now.Add(-time.Hour), 0, 5, ErrDailyLimitReached},
	}
	for _, tc := range cases {
		err := CheckReceipt(tc.issuedAt, now, tc.sameStore, tc.today)
		if !errors.Is(err, tc.want) && err != tc.want {
			t.Errorf("%s: got %v, want %v", tc.name, err, tc.want)
		}
	}
}

func newFact(cnpj, category string, at time.Time) ReceiptFact {
	return ReceiptFact{StoreKey: cnpj, Category: category, IssuedAt: at}
}

func TestAdvanceStoreMissionCountsDistinctStores(t *testing.T) {
	now := time.Date(2026, 11, 13, 15, 0, 0, 0, time.UTC)
	mission := Mission{ID: "m1", Title: "3 lojas", RuleType: RuleStores, Target: 3, RewardPoints: 150}

	history := []ReceiptFact{
		newFact("06347409018889", "esportes", now.Add(-48*time.Hour)),
		newFact("06347409018889", "esportes", now.Add(-24*time.Hour)), // same store
		newFact("22582843000186", "livraria", now.Add(-time.Hour)),
		newFact("11222333000181", "alimentacao", now.Add(-8*24*time.Hour)), // outside the window
	}
	got := Advance([]Mission{mission}, history, now)
	if len(got) != 1 {
		t.Fatalf("len = %d, want 1", len(got))
	}
	if got[0].Progress != 2 || got[0].Completed {
		t.Errorf("advancement = %+v, want progress 2 and not completed", got[0])
	}

	history = append(history, newFact("33444555000181", "moda", now))
	got = Advance([]Mission{mission}, history, now)
	if got[0].Progress != 3 || !got[0].Completed || got[0].PointsAwarded != 150 {
		t.Errorf("advancement = %+v, want progress 3 completed with 150", got[0])
	}
}

func TestAdvanceCategoryMissionUsesTheWeek(t *testing.T) {
	// Friday of the same ISO week.
	now := time.Date(2026, 11, 13, 15, 0, 0, 0, time.UTC)
	mission := Mission{ID: "m2", Title: "alimentacao e moda", RuleType: RuleCategory, Target: 2, RewardPoints: 100}

	sameWeek := []ReceiptFact{
		newFact("11222333000181", "alimentacao", now.AddDate(0, 0, -4)), // Monday
		newFact("06347409018889", "esportes", now),
	}
	if got := Advance([]Mission{mission}, sameWeek, now); got[0].Progress != 2 {
		// esportes and alimentacao are already two distinct categories
		t.Errorf("advancement = %+v, want progress 2", got[0])
	}

	oneCategory := []ReceiptFact{
		newFact("11222333000181", "alimentacao", now.AddDate(0, 0, -4)),
		newFact("22333444000181", "alimentacao", now),
	}
	if got := Advance([]Mission{mission}, oneCategory, now); got[0].Progress != 1 || got[0].Completed {
		t.Errorf("advancement = %+v, want progress 1", got[0])
	}

	history := append(oneCategory, newFact("33444555000181", "moda", now.AddDate(0, 0, -1)))
	if got := Advance([]Mission{mission}, history, now); got[0].Progress != 2 || !got[0].Completed {
		t.Errorf("advancement = %+v, want progress 2 completed", got[0])
	}

	// The previous week does not count.
	previousWeek := []ReceiptFact{
		newFact("11222333000181", "alimentacao", now.AddDate(0, 0, -8)),
		newFact("33444555000181", "moda", now),
	}
	if got := Advance([]Mission{mission}, previousWeek, now); got[0].Progress != 1 {
		t.Errorf("advancement = %+v, want progress 1", got[0])
	}
}

func TestAdvanceIgnoresUnsupportedRulesAndUnknownStores(t *testing.T) {
	now := time.Date(2026, 11, 13, 15, 0, 0, 0, time.UTC)
	missions := []Mission{
		{ID: "m3", RuleType: "rhythm", Target: 4, RewardPoints: 200},
		{ID: "m4", RuleType: RuleStores, Target: 3, RewardPoints: 150},
	}
	history := []ReceiptFact{
		newFact("", "", now), // unknown store and category: counted by nobody
	}
	if got := Advance(missions, history, now); len(got) != 0 {
		t.Errorf("advancements = %+v, want none", got)
	}
}
