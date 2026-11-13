-- One-time codes for the phone login. Only a keyed hash of the code is kept:
-- the plain code exists only in memory and in the message sent to the visitor.

create table otp_codes (
    id          uuid primary key default gen_random_uuid(),
    phone_hash  text        not null,
    code_hash   text        not null,
    expires_at  timestamptz not null,
    attempts    integer     not null default 0,
    consumed_at timestamptz,
    created_at  timestamptz not null default now()
);

create index otp_codes_phone_created_idx on otp_codes (phone_hash, created_at desc);
