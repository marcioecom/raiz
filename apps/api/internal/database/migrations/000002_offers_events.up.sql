-- Catalog that feeds the home screen and the partner API, plus the
-- partner API keys.

create table offers (
    id          uuid primary key default gen_random_uuid(),
    store_id    uuid references stores (id) on delete cascade,
    title       text        not null,
    description text,
    valid_from  timestamptz,
    valid_until timestamptz,
    active      boolean     not null default true,
    created_at  timestamptz not null default now()
);

create table events (
    id          uuid primary key default gen_random_uuid(),
    title       text        not null,
    description text,
    place       text,
    starts_at   timestamptz not null,
    ends_at     timestamptz,
    active      boolean     not null default true,
    created_at  timestamptz not null default now()
);

create table api_keys (
    id         uuid primary key default gen_random_uuid(),
    name       text        not null,
    key_hash   text        not null unique,
    scope      text        not null default 'partner' check (scope in ('partner', 'admin')),
    created_at timestamptz not null default now(),
    revoked_at timestamptz
);

create index offers_store_active_idx on offers (store_id, active);
create index events_starts_idx on events (starts_at);
