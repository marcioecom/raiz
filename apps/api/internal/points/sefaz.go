package points

import (
	"context"
	"time"
)

// FetchTimeout bounds the SEFAZ call: the receipt flow never waits longer.
const FetchTimeout = 2 * time.Second

// TotalFetcher is the enrichment point of the receipt flow. The access key
// already carries CNPJ, state and month locally; only the total value comes
// from an external source. qrParam is the QR payload ("p=" value) when the
// visitor scanned the code; it is empty on manual entry, which scores the base
// value. A failure or a timeout means "no total": it never blocks the credit.
type TotalFetcher interface {
	FetchTotal(ctx context.Context, accessKey, qrParam string) (cents int64, ok bool, err error)
}

// LocalFetcher is the no-network double: every receipt scores the base value.
// Production uses the SEFAZ client; this keeps tests and demo deterministic.
type LocalFetcher struct{}

func (LocalFetcher) FetchTotal(context.Context, string, string) (int64, bool, error) {
	return 0, false, nil
}
