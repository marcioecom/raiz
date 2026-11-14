package receipt

import (
	"testing"
	"time"
)

// A real Capim Dourado receipt: Centauro, 14 063 474 090 188 (November 2026).
const centauroKey = "17261106347409018889651210001017301655128527"

func TestIssuedAtUsesTheKeyMonth(t *testing.T) {
	key, err := Parse(centauroKey)
	if err != nil {
		t.Fatalf("Parse() error: %v", err)
	}

	// Scanned while the key month is current: the best estimate is now.
	now := time.Date(2026, 11, 13, 15, 30, 0, 0, time.UTC)
	if got := IssuedAt(key, now); !got.Equal(now) {
		t.Errorf("IssuedAt(current month) = %s, want %s", got, now)
	}

	// Scanned in a later month: the last instant of the key month.
	later := time.Date(2026, 12, 2, 9, 0, 0, 0, time.UTC)
	want := time.Date(2026, 11, 30, 23, 59, 59, 0, time.UTC)
	if got := IssuedAt(key, later); !got.Equal(want) {
		t.Errorf("IssuedAt(later) = %s, want %s", got, want)
	}
}
