package points

import (
	"context"
	"time"
)

// FetchTimeout bounds the SEFAZ call: the receipt flow never waits longer.
const FetchTimeout = 2 * time.Second

// TotalFetcher is the enrichment point of the receipt flow. The access key
// already carries CNPJ, state and month locally; only the total value (and the
// exact issue time) come from an external source. A failure or a timeout means
// "no total" and the base value: it never blocks the credit.
type TotalFetcher interface {
	FetchTotal(ctx context.Context, accessKey string) (cents int64, ok bool, err error)
}

// LocalFetcher is the default: no network yet, so every receipt scores the base
// value. Replace it with the SEFAZ client when the enrichment is implemented.
type LocalFetcher struct{}

func (LocalFetcher) FetchTotal(context.Context, string) (int64, bool, error) {
	return 0, false, nil
}
