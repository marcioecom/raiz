package store

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

// RedemptionTTL is how long the voucher is valid at the counter.
const RedemptionTTL = 10 * time.Minute

var (
	// ErrOutOfStock means the reward exists but has no units left.
	ErrOutOfStock = errors.New("reward out of stock")
	// ErrCodeCollision means the voucher code is already taken; the caller
	// draws another one. The unique constraint is the real guarantee.
	ErrCodeCollision = errors.New("redemption code already taken")
)

// InsufficientPointsError carries how many seeds are missing so the handler can
// answer with the documented `details.missing`.
type InsufficientPointsError struct{ Missing int }

func (e *InsufficientPointsError) Error() string {
	return fmt.Sprintf("insufficient points: %d missing", e.Missing)
}

// Reward is a catalog item with everything the rewards screen shows.
type Reward struct {
	ID        string
	Title     string
	Cost      int
	Stock     *int
	StoreName *string
	Terms     *string
}

// ActiveRewards lists every active reward, cheapest first. Out of stock items
// stay in the list: the visitor sees the whole catalog and the reason.
func (s *Store) ActiveRewards(ctx context.Context) ([]Reward, error) {
	rows, err := s.pool.Query(ctx, `
		select r.id::text, r.title, r.cost, r.stock, r.terms, st.name
		from rewards r
		left join stores st on st.id = r.store_id
		where r.active
		order by r.cost, r.title`)
	if err != nil {
		return nil, fmt.Errorf("loading rewards: %w", err)
	}
	defer rows.Close()

	rewards := make([]Reward, 0, 8)
	for rows.Next() {
		var reward Reward
		if err := rows.Scan(&reward.ID, &reward.Title, &reward.Cost, &reward.Stock,
			&reward.Terms, &reward.StoreName); err != nil {
			return nil, fmt.Errorf("scanning reward: %w", err)
		}
		rewards = append(rewards, reward)
	}
	return rewards, rows.Err()
}

// Redemption is the issued voucher plus the balance it left behind.
type Redemption struct {
	ID           string
	Code         string
	ExpiresAt    time.Time
	BalanceAfter int
	Reward       Reward
}

// Redeem debits the ledger, takes one unit of stock and writes the voucher in a
// single transaction. The reward row is locked first and the balance is summed
// after the lock, so a concurrent redemption can never drive it negative.
func (s *Store) Redeem(ctx context.Context, visitorID, rewardID, code string) (Redemption, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return Redemption{}, fmt.Errorf("begin redemption transaction: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	// The visitor row lock serializes two redemptions of the same visitor on
	// different rewards, which the reward lock alone would not do.
	if _, err := tx.Exec(ctx,
		`select 1 from visitors where id = $1::uuid for update`, visitorID,
	); err != nil {
		return Redemption{}, fmt.Errorf("locking visitor: %w", err)
	}

	var reward Reward
	err = tx.QueryRow(ctx, `
		select r.id::text, r.title, r.cost, r.stock, r.terms, st.name
		from rewards r
		left join stores st on st.id = r.store_id
		where r.id = $1::uuid and r.active
		for update of r`, rewardID,
	).Scan(&reward.ID, &reward.Title, &reward.Cost, &reward.Stock, &reward.Terms, &reward.StoreName)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return Redemption{}, ErrNotFound
		}
		return Redemption{}, fmt.Errorf("locking reward: %w", err)
	}

	if reward.Stock != nil && *reward.Stock <= 0 {
		return Redemption{}, ErrOutOfStock
	}

	var balance int
	if err := tx.QueryRow(ctx,
		`select coalesce(sum(delta), 0)::int from ledger where visitor_id = $1::uuid`,
		visitorID,
	).Scan(&balance); err != nil {
		return Redemption{}, fmt.Errorf("loading balance: %w", err)
	}
	if balance < reward.Cost {
		return Redemption{}, &InsufficientPointsError{Missing: reward.Cost - balance}
	}

	var out Redemption
	err = tx.QueryRow(ctx, `
		insert into redemptions (visitor_id, reward_id, code, expires_at)
		values ($1::uuid, $2::uuid, $3, now() + $4::interval)
		returning id::text, code, expires_at`,
		visitorID, rewardID, code, RedemptionTTL.String(),
	).Scan(&out.ID, &out.Code, &out.ExpiresAt)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == uniqueViolation {
			return Redemption{}, ErrCodeCollision
		}
		return Redemption{}, fmt.Errorf("inserting redemption: %w", err)
	}

	if _, err := tx.Exec(ctx, `
		insert into ledger (visitor_id, kind, delta, ref_type, ref_id)
		values ($1::uuid, 'redeem', $2, 'redemption', $3::uuid)`,
		visitorID, -reward.Cost, out.ID,
	); err != nil {
		return Redemption{}, fmt.Errorf("debiting redemption: %w", err)
	}

	if _, err := tx.Exec(ctx,
		`update rewards set stock = stock - 1 where id = $1::uuid and stock is not null`,
		rewardID,
	); err != nil {
		return Redemption{}, fmt.Errorf("decrementing stock: %w", err)
	}
	if reward.Stock != nil {
		left := *reward.Stock - 1
		reward.Stock = &left
	}

	if err := tx.Commit(ctx); err != nil {
		return Redemption{}, fmt.Errorf("commit redemption transaction: %w", err)
	}

	out.BalanceAfter = balance - reward.Cost
	out.Reward = reward
	return out, nil
}
