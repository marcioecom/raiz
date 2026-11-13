package database

import (
	"context"
	"embed"
	"fmt"
	"io/fs"
	"sort"
	"strconv"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
)

// shortcut: migrations run at boot from an embedded runner (file names stay
// compatible with golang-migrate) instead of the migrate binary; move to
// golang-migrate when there is a CI/CD step that owns schema changes.
//
//go:embed migrations/*.up.sql
var migrationFiles embed.FS

// Migrate applies every pending migration in order, each one in its own
// transaction, and records the version in schema_migrations.
func Migrate(ctx context.Context, pool *pgxpool.Pool) error {
	if _, err := pool.Exec(ctx, `
		create table if not exists schema_migrations (
			version    bigint primary key,
			applied_at timestamptz not null default now()
		)`); err != nil {
		return fmt.Errorf("creating schema_migrations: %w", err)
	}

	names, err := fs.Glob(migrationFiles, "migrations/*.up.sql")
	if err != nil {
		return fmt.Errorf("listing migrations: %w", err)
	}
	sort.Strings(names)

	for _, name := range names {
		version, err := versionOf(name)
		if err != nil {
			return err
		}

		var applied bool
		if err := pool.QueryRow(ctx,
			`select exists(select 1 from schema_migrations where version = $1)`, version,
		).Scan(&applied); err != nil {
			return fmt.Errorf("checking version %d: %w", version, err)
		}
		if applied {
			continue
		}

		sqlBytes, err := migrationFiles.ReadFile(name)
		if err != nil {
			return fmt.Errorf("reading %s: %w", name, err)
		}

		tx, err := pool.Begin(ctx)
		if err != nil {
			return fmt.Errorf("begin transaction: %w", err)
		}
		if _, err := tx.Exec(ctx, string(sqlBytes)); err != nil {
			_ = tx.Rollback(ctx)
			return fmt.Errorf("applying %s: %w", name, err)
		}
		if _, err := tx.Exec(ctx, `insert into schema_migrations (version) values ($1)`, version); err != nil {
			_ = tx.Rollback(ctx)
			return fmt.Errorf("recording %s: %w", name, err)
		}
		if err := tx.Commit(ctx); err != nil {
			return fmt.Errorf("commit %s: %w", name, err)
		}
	}
	return nil
}

// versionOf extracts the number from "migrations/000001_init.up.sql".
func versionOf(name string) (int64, error) {
	base := strings.TrimPrefix(name, "migrations/")
	base = strings.TrimSuffix(base, ".up.sql")
	if i := strings.IndexByte(base, '_'); i > 0 {
		base = base[:i]
	}
	version, err := strconv.ParseInt(base, 10, 64)
	if err != nil {
		return 0, fmt.Errorf("invalid migration name %q: %w", name, err)
	}
	return version, nil
}
