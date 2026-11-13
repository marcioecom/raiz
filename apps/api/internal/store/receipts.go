package store

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/marcioecom/raiz/apps/api/internal/points"
)

// ErrAlreadyClaimed means the access key is already in receipts. The fiscal key
// is the real idempotency: the unique constraint is the last line of defense
// against a concurrent double submit.
var ErrAlreadyClaimed = errors.New("receipt already claimed")

const uniqueViolation = "23505"

// StoreInfo is the partner store found by the CNPJ printed on the key.
type StoreInfo struct {
	ID       string
	Name     string
	Category string
}

func (s *Store) StoreByCNPJ(ctx context.Context, cnpj string) (StoreInfo, error) {
	var info StoreInfo
	err := s.pool.QueryRow(ctx,
		`select id::text, name, category from stores where cnpj = $1`, cnpj,
	).Scan(&info.ID, &info.Name, &info.Category)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return StoreInfo{}, ErrNotFound
		}
		return StoreInfo{}, fmt.Errorf("loading store by cnpj: %w", err)
	}
	return info, nil
}

// ReceiptClaimed reports whether the access key is already registered. The API
// answers 409 for it; the unique constraint still decides the race after the
// check, so a concurrent double submit is never credited twice.
func (s *Store) ReceiptClaimed(ctx context.Context, accessKey string) (bool, error) {
	var claimed bool
	err := s.pool.QueryRow(ctx,
		`select exists (select 1 from receipts where access_key = $1)`, accessKey,
	).Scan(&claimed)
	if err != nil {
		return false, fmt.Errorf("checking access key: %w", err)
	}
	return claimed, nil
}

// ReceiptCounters counts the visitor receipts issued on the same calendar day
// (UTC) as day. storeID is nil for an unknown CNPJ: those receipts share the
// null store.
func (s *Store) ReceiptCounters(ctx context.Context, visitorID string, storeID *string, day time.Time) (sameStore, today int, err error) {
	err = s.pool.QueryRow(ctx, `
		select
			count(*) filter (where store_id is not distinct from $2::uuid),
			count(*)
		from receipts
		where visitor_id = $1::uuid
		  and issued_at >= date_trunc('day', $3::timestamptz)
		  and issued_at < date_trunc('day', $3::timestamptz) + interval '1 day'`,
		visitorID, storeID, day,
	).Scan(&sameStore, &today)
	if err != nil {
		return 0, 0, fmt.Errorf("counting receipts: %w", err)
	}
	return sameStore, today, nil
}

type NewReceipt struct {
	VisitorID  string
	StoreID    *string
	AccessKey  string
	TotalCents *int
	IssuedAt   time.Time
	Points     int
	Source     string
	Status     string
}

type Receipt struct {
	ID       string
	IssuedAt time.Time
}

// CreateReceipt writes the receipt and its ledger credit in one transaction.
// The access key unique constraint decides the race: a duplicate returns
// ErrAlreadyClaimed and nothing is credited.
func (s *Store) CreateReceipt(ctx context.Context, in NewReceipt) (Receipt, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return Receipt{}, fmt.Errorf("begin receipt transaction: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	var out Receipt
	err = tx.QueryRow(ctx, `
		insert into receipts (visitor_id, store_id, access_key, total_cents, issued_at, points_awarded, source, status)
		values ($1::uuid, $2::uuid, $3, $4, $5, $6, $7, $8)
		returning id::text, issued_at`,
		in.VisitorID, in.StoreID, in.AccessKey, in.TotalCents, in.IssuedAt, in.Points, in.Source, in.Status,
	).Scan(&out.ID, &out.IssuedAt)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == uniqueViolation {
			return Receipt{}, ErrAlreadyClaimed
		}
		return Receipt{}, fmt.Errorf("inserting receipt: %w", err)
	}

	if _, err := tx.Exec(ctx, `
		insert into ledger (visitor_id, kind, delta, ref_type, ref_id)
		values ($1::uuid, 'receipt', $2, 'receipt', $3::uuid)`,
		in.VisitorID, in.Points, out.ID,
	); err != nil {
		return Receipt{}, fmt.Errorf("crediting receipt: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return Receipt{}, fmt.Errorf("commit receipt transaction: %w", err)
	}
	return out, nil
}

// ReceiptHistory loads the receipts a mission rule looks at. An unknown store
// arrives with empty keys and matches no rule.
func (s *Store) ReceiptHistory(ctx context.Context, visitorID string, from time.Time) ([]points.ReceiptFact, error) {
	rows, err := s.pool.Query(ctx, `
		select coalesce(st.cnpj::text, ''), coalesce(st.category, ''), r.issued_at
		from receipts r
		left join stores st on st.id = r.store_id
		where r.visitor_id = $1::uuid and r.issued_at >= $2
		order by r.issued_at`, visitorID, from)
	if err != nil {
		return nil, fmt.Errorf("loading receipt history: %w", err)
	}
	defer rows.Close()

	facts := make([]points.ReceiptFact, 0, 16)
	for rows.Next() {
		var fact points.ReceiptFact
		if err := rows.Scan(&fact.StoreKey, &fact.Category, &fact.IssuedAt); err != nil {
			return nil, fmt.Errorf("scanning receipt history: %w", err)
		}
		facts = append(facts, fact)
	}
	return facts, rows.Err()
}

// MissionState is a mission with this visitor's progress.
type MissionState struct {
	points.Mission
	Counter   int
	Completed bool
}

func (s *Store) Missions(ctx context.Context, visitorID string) ([]MissionState, error) {
	rows, err := s.pool.Query(ctx, `
		select m.id::text, m.title, m.rule_type, m.target, m.reward_points,
		       coalesce(p.counter, 0), p.completed_at is not null
		from missions m
		left join mission_progress p
		       on p.mission_id = m.id and p.visitor_id = $1::uuid
		where m.active
		order by m.code`, visitorID)
	if err != nil {
		return nil, fmt.Errorf("loading missions: %w", err)
	}
	defer rows.Close()

	states := make([]MissionState, 0, 8)
	for rows.Next() {
		var st MissionState
		if err := rows.Scan(&st.ID, &st.Title, &st.RuleType, &st.Target, &st.RewardPoints,
			&st.Counter, &st.Completed); err != nil {
			return nil, fmt.Errorf("scanning mission: %w", err)
		}
		states = append(states, st)
	}
	return states, rows.Err()
}

type MissionUpdate struct {
	ID           string
	Counter      int
	Target       int
	RewardPoints int
}

// AwardMission stores the counter and credits the bonus only when this call
// claims the completion. The guarded update makes the bonus single-shot even
// under a double submit: the second call sees completed_at filled and gets 0.
func (s *Store) AwardMission(ctx context.Context, visitorID string, u MissionUpdate) (int, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return 0, fmt.Errorf("begin mission transaction: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	if _, err := tx.Exec(ctx, `
		insert into mission_progress (visitor_id, mission_id, counter)
		values ($1::uuid, $2::uuid, $3)
		on conflict (visitor_id, mission_id) do update
		set counter = greatest(mission_progress.counter, excluded.counter)`,
		visitorID, u.ID, u.Counter,
	); err != nil {
		return 0, fmt.Errorf("updating mission progress: %w", err)
	}

	awarded := 0
	if u.Counter >= u.Target {
		tag, err := tx.Exec(ctx, `
			update mission_progress set completed_at = now()
			where visitor_id = $1::uuid and mission_id = $2::uuid and completed_at is null`,
			visitorID, u.ID)
		if err != nil {
			return 0, fmt.Errorf("completing mission: %w", err)
		}
		if tag.RowsAffected() == 1 {
			if _, err := tx.Exec(ctx, `
				insert into ledger (visitor_id, kind, delta, ref_type, ref_id)
				values ($1::uuid, 'mission', $2, 'mission', $3::uuid)`,
				visitorID, u.RewardPoints, u.ID,
			); err != nil {
				return 0, fmt.Errorf("crediting mission: %w", err)
			}
			awarded = u.RewardPoints
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return 0, fmt.Errorf("commit mission transaction: %w", err)
	}
	return awarded, nil
}

func (s *Store) LedgerBalance(ctx context.Context, visitorID string) (int, error) {
	var balance int
	err := s.pool.QueryRow(ctx,
		`select coalesce(sum(delta), 0)::int from ledger where visitor_id = $1::uuid`, visitorID,
	).Scan(&balance)
	if err != nil {
		return 0, fmt.Errorf("loading ledger balance: %w", err)
	}
	return balance, nil
}

// LedgerCursor is the keyset position (created_at, id) of the last entry read.
type LedgerCursor struct {
	CreatedAt time.Time
	ID        string
}

// LedgerRow carries the raw pieces the handler needs to write the visitor
// facing description in pt-BR.
type LedgerRow struct {
	ID           string
	Kind         string
	Delta        int
	StoreName    *string
	MissionTitle *string
	CreatedAt    time.Time
}

// LedgerPage reads one keyset page, newest first, ordered by created_at and id
// so equal timestamps never repeat or skip entries.
func (s *Store) LedgerPage(ctx context.Context, visitorID string, before *LedgerCursor, limit int) ([]LedgerRow, error) {
	var beforeAt *time.Time
	var beforeID *string
	if before != nil {
		beforeAt = &before.CreatedAt
		beforeID = &before.ID
	}

	rows, err := s.pool.Query(ctx, `
		select l.id::text, l.kind, l.delta, l.created_at, st.name, m.title
		from ledger l
		left join receipts r on l.ref_type = 'receipt' and r.id = l.ref_id
		left join stores st on st.id = r.store_id
		left join missions m on l.ref_type = 'mission' and m.id = l.ref_id
		where l.visitor_id = $1::uuid
		  and ($2::timestamptz is null or (l.created_at, l.id) < ($2::timestamptz, $3::uuid))
		order by l.created_at desc, l.id desc
		limit $4`, visitorID, beforeAt, beforeID, limit)
	if err != nil {
		return nil, fmt.Errorf("loading ledger page: %w", err)
	}
	defer rows.Close()

	entries := make([]LedgerRow, 0, limit)
	for rows.Next() {
		var row LedgerRow
		if err := rows.Scan(&row.ID, &row.Kind, &row.Delta, &row.CreatedAt, &row.StoreName, &row.MissionTitle); err != nil {
			return nil, fmt.Errorf("scanning ledger entry: %w", err)
		}
		entries = append(entries, row)
	}
	return entries, rows.Err()
}
