package store

import (
	"context"
	"fmt"
	"time"
)

// OfferCursor is the keyset position (valid_until nulls last, id) of the last
// offer of a page.
type OfferCursor struct {
	ValidUntil *time.Time
	ID         string
}

// OfferPage reads one partner-API page. Expired offers never show up, and a
// nil storeID lists every store.
func (s *Store) OfferPage(ctx context.Context, storeID *string, after *OfferCursor, limit int) ([]Offer, error) {
	var (
		afterID   *string
		afterNull bool
		afterAt   *time.Time
	)
	if after != nil {
		afterID = &after.ID
		afterNull = after.ValidUntil == nil
		afterAt = after.ValidUntil
	}

	rows, err := s.pool.Query(ctx, `
		select o.id::text, o.store_id::text, st.name, o.title, o.description, o.valid_until
		from offers o
		left join stores st on st.id = o.store_id
		where o.active
		  and (o.valid_from is null or o.valid_from <= now())
		  and (o.valid_until is null or o.valid_until > now())
		  and ($1::uuid is null or o.store_id = $1::uuid)
		  and ($2::uuid is null or
		       ($3::boolean, coalesce($4::timestamptz, 'infinity'::timestamptz), $2::uuid)
		       < ((o.valid_until is null), coalesce(o.valid_until, 'infinity'::timestamptz), o.id))
		order by coalesce(o.valid_until, 'infinity'::timestamptz), o.id
		limit $5`, storeID, afterID, afterNull, afterAt, limit)
	if err != nil {
		return nil, fmt.Errorf("loading offer page: %w", err)
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

// StoreVisits is one store of the partner top list.
type StoreVisits struct {
	StoreName string
	Visits    int
}

// Metrics holds aggregated indicators only. There is no visitor id here on
// purpose: the partner API never sees an individual.
type Metrics struct {
	IdentifiedVisits  int
	UniqueVisitors    int
	ReturningVisitors int
	// StoreVisits is the sum of distinct stores per visitor with a receipt.
	StoreVisits int
	Redemptions int
	TopStores   []StoreVisits
}

// Metrics summarizes [from, to). Soft-deleted visitors are left out of every
// aggregate, matching their deletion.
func (s *Store) Metrics(ctx context.Context, from, to time.Time) (Metrics, error) {
	var m Metrics
	err := s.pool.QueryRow(ctx, `
		with per_visitor as (
			select r.visitor_id,
			       count(*)::int as visits,
			       count(distinct coalesce(r.store_id::text, ''))::int as stores
			from receipts r
			join visitors v on v.id = r.visitor_id and v.deleted_at is null
			where r.issued_at >= $1 and r.issued_at < $2
			group by r.visitor_id
		)
		select coalesce(sum(visits), 0)::int,
		       count(*)::int,
		       count(*) filter (where visits > 1)::int,
		       coalesce(sum(stores), 0)::int,
		       (select count(*) from redemptions rd
		        join visitors v on v.id = rd.visitor_id and v.deleted_at is null
		        where rd.created_at >= $1 and rd.created_at < $2)::int
		from per_visitor`, from, to,
	).Scan(&m.IdentifiedVisits, &m.UniqueVisitors, &m.ReturningVisitors, &m.StoreVisits, &m.Redemptions)
	if err != nil {
		return Metrics{}, fmt.Errorf("loading metrics: %w", err)
	}

	rows, err := s.pool.Query(ctx, `
		select st.name, count(*)::int
		from receipts r
		join stores st on st.id = r.store_id
		join visitors v on v.id = r.visitor_id and v.deleted_at is null
		where r.issued_at >= $1 and r.issued_at < $2
		group by st.name
		order by count(*) desc, st.name
		limit 5`, from, to)
	if err != nil {
		return Metrics{}, fmt.Errorf("loading top stores: %w", err)
	}
	defer rows.Close()

	m.TopStores = make([]StoreVisits, 0, 5)
	for rows.Next() {
		var row StoreVisits
		if err := rows.Scan(&row.StoreName, &row.Visits); err != nil {
			return Metrics{}, fmt.Errorf("scanning top store: %w", err)
		}
		m.TopStores = append(m.TopStores, row)
	}
	return m, rows.Err()
}
