-- Initial Raiz schema.
-- The balance is always the ledger: there is no mutable balance column.

create table visitors (
    id         uuid primary key default gen_random_uuid(),
    phone_hash text        not null unique,
    phone_enc  text        not null,
    name       text        not null,
    created_at timestamptz not null default now(),
    consent_at timestamptz,
    deleted_at timestamptz
);

create table stores (
    id         uuid primary key default gen_random_uuid(),
    cnpj       char(14)    not null unique check (cnpj ~ '^[0-9]{14}$'),
    name       text        not null,
    category   text        not null,
    floor      text,
    is_partner boolean     not null default false,
    created_at timestamptz not null default now()
);

create table seasons (
    id        uuid primary key default gen_random_uuid(),
    name      text not null,
    starts_at date not null,
    ends_at   date not null,
    status    text not null default 'active' check (status in ('active', 'closed'))
);

create table missions (
    id            uuid primary key default gen_random_uuid(),
    season_id     uuid references seasons (id) on delete cascade,
    code          text    not null unique,
    title         text    not null,
    rule_type     text    not null check (rule_type in ('stores', 'category', 'rhythm', 'first_receipt', 'referral')),
    target        integer not null check (target > 0),
    reward_points integer not null check (reward_points > 0),
    active        boolean not null default true
);

create table receipts (
    id             uuid primary key default gen_random_uuid(),
    visitor_id     uuid        not null references visitors (id) on delete cascade,
    store_id       uuid        references stores (id) on delete set null,
    access_key     char(44)    not null unique,
    total_cents    integer     check (total_cents is null or total_cents >= 0),
    issued_at      timestamptz not null,
    points_awarded integer     not null default 0 check (points_awarded >= 0),
    source         text        not null default 'qr' check (source in ('qr', 'manual')),
    status         text        not null default 'accepted' check (status in ('accepted', 'review')),
    created_at     timestamptz not null default now()
);

-- Immutable entries. The balance is the sum of delta.
create table ledger (
    id         uuid primary key default gen_random_uuid(),
    visitor_id uuid        not null references visitors (id) on delete cascade,
    kind       text        not null check (kind in ('receipt', 'mission', 'rhythm', 'referral', 'redeem', 'adjustment')),
    delta      integer     not null,
    ref_type   text,
    ref_id     uuid,
    created_at timestamptz not null default now()
);

create table mission_progress (
    visitor_id   uuid        not null references visitors (id) on delete cascade,
    mission_id   uuid        not null references missions (id) on delete cascade,
    counter      integer     not null default 0 check (counter >= 0),
    completed_at timestamptz,
    primary key (visitor_id, mission_id)
);

create table rewards (
    id       uuid primary key default gen_random_uuid(),
    store_id uuid references stores (id) on delete set null,
    title    text    not null,
    cost     integer not null check (cost > 0),
    stock    integer check (stock is null or stock >= 0),
    terms    text,
    active   boolean not null default true
);

create table redemptions (
    id         uuid primary key default gen_random_uuid(),
    visitor_id uuid        not null references visitors (id) on delete cascade,
    reward_id  uuid        not null references rewards (id),
    code       char(6)     not null unique,
    status     text        not null default 'pending' check (status in ('pending', 'used', 'expired')),
    created_at timestamptz not null default now(),
    expires_at timestamptz not null,
    used_at    timestamptz
);

create index receipts_visitor_created_idx on receipts (visitor_id, created_at desc);
create index receipts_store_issued_idx on receipts (store_id, issued_at desc);
create index ledger_visitor_created_idx on ledger (visitor_id, created_at desc);
create index ledger_visitor_kind_idx on ledger (visitor_id, kind, created_at desc);
create index redemptions_visitor_idx on redemptions (visitor_id, created_at desc);
