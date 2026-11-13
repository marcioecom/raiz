package database

import (
	"context"
	_ "embed"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
)

//go:embed seed.sql
var seedSQL string

// Seed applies the demo dataset. It is idempotent: fixed UUIDs plus
// ON CONFLICT DO NOTHING make it safe to run on every deploy.
func Seed(ctx context.Context, pool *pgxpool.Pool) error {
	if _, err := pool.Exec(ctx, seedSQL); err != nil {
		return fmt.Errorf("applying seed: %w", err)
	}
	return nil
}
