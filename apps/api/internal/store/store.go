// Package store is the persistence layer: explicit SQL through pgx, no ORM.
// Every query is parameterized and every id is passed to the caller as text so
// the HTTP layer never deals with driver-specific types.
package store

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// ErrNotFound is the only sentinel handlers need: everything else is a real
// failure and must surface as 500.
var ErrNotFound = errors.New("not found")

type Store struct {
	pool *pgxpool.Pool
}

func New(pool *pgxpool.Pool) *Store { return &Store{pool: pool} }

type Visitor struct {
	ID        string
	Name      string
	PhoneEnc  string
	CreatedAt time.Time
	DeletedAt *time.Time
}

const visitorColumns = `id::text, name, phone_enc, created_at, deleted_at`

func scanVisitor(row pgx.Row) (Visitor, error) {
	var v Visitor
	if err := row.Scan(&v.ID, &v.Name, &v.PhoneEnc, &v.CreatedAt, &v.DeletedAt); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return Visitor{}, ErrNotFound
		}
		return Visitor{}, err
	}
	return v, nil
}

func (s *Store) VisitorByPhoneHash(ctx context.Context, phoneHash string) (Visitor, error) {
	return scanVisitor(s.pool.QueryRow(ctx,
		`select `+visitorColumns+` from visitors where phone_hash = $1`, phoneHash))
}

func (s *Store) VisitorByID(ctx context.Context, id string) (Visitor, error) {
	return scanVisitor(s.pool.QueryRow(ctx,
		`select `+visitorColumns+` from visitors where id = $1::uuid`, id))
}

// CreateVisitor records the LGPD consent at the moment of creation.
func (s *Store) CreateVisitor(ctx context.Context, phoneHash, phoneEnc, name string) (Visitor, error) {
	return scanVisitor(s.pool.QueryRow(ctx, `
		insert into visitors (phone_hash, phone_enc, name, consent_at)
		values ($1, $2, $3, now())
		returning `+visitorColumns, phoneHash, phoneEnc, name))
}

// SoftDeleteVisitor is the LGPD deletion: the row stays (anonymization runs
// later) but the token stops resolving to an active visitor.
func (s *Store) SoftDeleteVisitor(ctx context.Context, id string) error {
	tag, err := s.pool.Exec(ctx,
		`update visitors set deleted_at = now() where id = $1::uuid and deleted_at is null`, id)
	if err != nil {
		return fmt.Errorf("soft deleting visitor: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

type OTP struct {
	ID         string
	CodeHash   string
	ExpiresAt  time.Time
	Attempts   int
	ConsumedAt *time.Time
}

// CreateOTP invalidates the previous unconsumed codes for the same phone and
// stores the new one in the same transaction.
func (s *Store) CreateOTP(ctx context.Context, phoneHash, codeHash string, expiresAt time.Time) error {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin otp transaction: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	if _, err := tx.Exec(ctx,
		`update otp_codes set consumed_at = now() where phone_hash = $1 and consumed_at is null`,
		phoneHash,
	); err != nil {
		return fmt.Errorf("invalidating previous otp codes: %w", err)
	}

	if _, err := tx.Exec(ctx,
		`insert into otp_codes (phone_hash, code_hash, expires_at) values ($1, $2, $3)`,
		phoneHash, codeHash, expiresAt,
	); err != nil {
		return fmt.Errorf("inserting otp code: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit otp transaction: %w", err)
	}
	return nil
}

// LatestOTP returns the most recent code for a phone, consumed or not: the
// handler decides why it is not usable.
func (s *Store) LatestOTP(ctx context.Context, phoneHash string) (OTP, error) {
	var otp OTP
	err := s.pool.QueryRow(ctx, `
		select id::text, code_hash, expires_at, attempts, consumed_at
		from otp_codes
		where phone_hash = $1
		order by created_at desc
		limit 1`, phoneHash,
	).Scan(&otp.ID, &otp.CodeHash, &otp.ExpiresAt, &otp.Attempts, &otp.ConsumedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return OTP{}, ErrNotFound
		}
		return OTP{}, err
	}
	return otp, nil
}

func (s *Store) IncrementOTPAttempts(ctx context.Context, id string) error {
	_, err := s.pool.Exec(ctx,
		`update otp_codes set attempts = attempts + 1 where id = $1::uuid`, id)
	return err
}

// ConsumeOTP is guarded by `consumed_at is null`, so two concurrent verifies
// cannot both spend the same code.
func (s *Store) ConsumeOTP(ctx context.Context, id string) error {
	tag, err := s.pool.Exec(ctx,
		`update otp_codes set consumed_at = now() where id = $1::uuid and consumed_at is null`, id)
	if err != nil {
		return fmt.Errorf("consuming otp code: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// MeStats is everything GET /v1/me needs beyond the visitor row. Earned is the
// sum of gains inside the 12-month tier window.
type MeStats struct {
	Balance       int
	Earned        int
	ReceiptsCount int
	FirstVisitAt  *time.Time
}

func (s *Store) MeStats(ctx context.Context, visitorID string) (MeStats, error) {
	var stats MeStats
	err := s.pool.QueryRow(ctx, `
		select
			coalesce((select sum(delta) from ledger where visitor_id = $1::uuid), 0)::int,
			coalesce((select sum(delta) from ledger
				where visitor_id = $1::uuid and delta > 0
				  and created_at >= now() - interval '12 months'), 0)::int,
			(select count(*) from receipts where visitor_id = $1::uuid)::int,
			(select min(issued_at) from receipts where visitor_id = $1::uuid)`,
		visitorID,
	).Scan(&stats.Balance, &stats.Earned, &stats.ReceiptsCount, &stats.FirstVisitAt)
	if err != nil {
		return MeStats{}, fmt.Errorf("loading me stats: %w", err)
	}
	return stats, nil
}

// ReceiptWeeks returns the distinct ISO week starts (Monday, UTC) that have at
// least one receipt, newest first.
func (s *Store) ReceiptWeeks(ctx context.Context, visitorID string) ([]time.Time, error) {
	rows, err := s.pool.Query(ctx, `
		select distinct date_trunc('week', issued_at at time zone 'UTC')::date
		from receipts
		where visitor_id = $1::uuid
		order by 1 desc
		limit 260`, visitorID)
	if err != nil {
		return nil, fmt.Errorf("loading receipt weeks: %w", err)
	}
	defer rows.Close()

	weeks := make([]time.Time, 0, 26)
	for rows.Next() {
		var week time.Time
		if err := rows.Scan(&week); err != nil {
			return nil, fmt.Errorf("scanning receipt week: %w", err)
		}
		weeks = append(weeks, week)
	}
	return weeks, rows.Err()
}
