package store

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
)

// Season is an active safra. The dates are calendar days, not instants.
type Season struct {
	ID       string
	Name     string
	StartsAt time.Time
	EndsAt   time.Time
}

// ActiveSeason returns the running safra, or ErrNotFound when none is open.
func (s *Store) ActiveSeason(ctx context.Context) (Season, error) {
	var season Season
	err := s.pool.QueryRow(ctx, `
		select id::text, name, starts_at, ends_at
		from seasons
		where status = 'active'
		order by starts_at desc
		limit 1`,
	).Scan(&season.ID, &season.Name, &season.StartsAt, &season.EndsAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return Season{}, ErrNotFound
		}
		return Season{}, fmt.Errorf("loading active season: %w", err)
	}
	return season, nil
}

// Event is one item of the mall schedule shown on the home screen.
type Event struct {
	Title    string
	StartsAt time.Time
	Place    *string
}

// EventsBetween reads the active events that start inside the window.
func (s *Store) EventsBetween(ctx context.Context, from, to time.Time) ([]Event, error) {
	rows, err := s.pool.Query(ctx, `
		select title, starts_at, place
		from events
		where active and starts_at >= $1 and starts_at < $2
		order by starts_at`, from, to)
	if err != nil {
		return nil, fmt.Errorf("loading events: %w", err)
	}
	defer rows.Close()

	events := make([]Event, 0, 4)
	for rows.Next() {
		var event Event
		if err := rows.Scan(&event.Title, &event.StartsAt, &event.Place); err != nil {
			return nil, fmt.Errorf("scanning event: %w", err)
		}
		events = append(events, event)
	}
	return events, rows.Err()
}

// Offer is an active store offer. The visitor UI and the partner API share it.
type Offer struct {
	ID          string
	StoreID     *string
	StoreName   *string
	Title       string
	Description *string
	ValidUntil  *time.Time
}

// ActiveOffers returns the offers valid right now, soonest expiry first.
func (s *Store) ActiveOffers(ctx context.Context, limit int) ([]Offer, error) {
	rows, err := s.pool.Query(ctx, `
		select o.id::text, o.store_id::text, st.name, o.title, o.description, o.valid_until
		from offers o
		left join stores st on st.id = o.store_id
		where o.active
		  and (o.valid_from is null or o.valid_from <= now())
		  and (o.valid_until is null or o.valid_until > now())
		order by o.valid_until nulls last, o.title
		limit $1`, limit)
	if err != nil {
		return nil, fmt.Errorf("loading offers: %w", err)
	}
	defer rows.Close()

	offers := make([]Offer, 0, limit)
	for rows.Next() {
		var offer Offer
		if err := rows.Scan(&offer.ID, &offer.StoreID, &offer.StoreName, &offer.Title,
			&offer.Description, &offer.ValidUntil); err != nil {
			return nil, fmt.Errorf("scanning offer: %w", err)
		}
		offers = append(offers, offer)
	}
	return offers, rows.Err()
}

// RewardOption is the piece of a reward the home screen needs to answer "how
// far am I from the next benefit". No need to load the whole catalog here.
type RewardOption struct {
	Title string
	Cost  int
}

// AvailableRewards lists the rewards in stock, cheapest first.
func (s *Store) AvailableRewards(ctx context.Context) ([]RewardOption, error) {
	rows, err := s.pool.Query(ctx, `
		select title, cost
		from rewards
		where active and (stock is null or stock > 0)
		order by cost`)
	if err != nil {
		return nil, fmt.Errorf("loading rewards: %w", err)
	}
	defer rows.Close()

	options := make([]RewardOption, 0, 8)
	for rows.Next() {
		var option RewardOption
		if err := rows.Scan(&option.Title, &option.Cost); err != nil {
			return nil, fmt.Errorf("scanning reward: %w", err)
		}
		options = append(options, option)
	}
	return options, rows.Err()
}

// LeaderboardRow is one ranked visitor. Only aggregated ledger sums: the
// ranking is a view over the ledger, not a separate score table.
type LeaderboardRow struct {
	VisitorID string
	Name      string
	Points    int
}

func (s *Store) Leaderboard(ctx context.Context, from, to time.Time, limit int) ([]LeaderboardRow, error) {
	rows, err := s.pool.Query(ctx, `
		select v.id::text, v.name, sum(l.delta)::int as points
		from ledger l
		join visitors v on v.id = l.visitor_id
		where l.created_at >= $1 and l.created_at < $2 and v.deleted_at is null
		group by v.id, v.name
		having sum(l.delta) > 0
		order by points desc, v.name
		limit $3`, from, to, limit)
	if err != nil {
		return nil, fmt.Errorf("loading leaderboard: %w", err)
	}
	defer rows.Close()

	entries := make([]LeaderboardRow, 0, limit)
	for rows.Next() {
		var row LeaderboardRow
		if err := rows.Scan(&row.VisitorID, &row.Name, &row.Points); err != nil {
			return nil, fmt.Errorf("scanning leaderboard row: %w", err)
		}
		entries = append(entries, row)
	}
	return entries, rows.Err()
}

// LeaderboardStanding is the visitor own position, even outside the top. Ties
// share the position of the first one with the same points.
func (s *Store) LeaderboardStanding(ctx context.Context, from, to time.Time, visitorID string) (points, position int, err error) {
	err = s.pool.QueryRow(ctx, `
		with totals as (
			select l.visitor_id, sum(l.delta)::int as points
			from ledger l
			join visitors v on v.id = l.visitor_id and v.deleted_at is null
			where l.created_at >= $1 and l.created_at < $2
			group by l.visitor_id
		), mine as (
			select coalesce((select points from totals where visitor_id = $3::uuid), 0) as points
		)
		select mine.points,
		       (select count(*) from totals where points > mine.points)::int + 1
		from mine`, from, to, visitorID,
	).Scan(&points, &position)
	if err != nil {
		return 0, 0, fmt.Errorf("loading leaderboard standing: %w", err)
	}
	return points, position, nil
}
