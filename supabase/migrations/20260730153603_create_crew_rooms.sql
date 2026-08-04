create schema if not exists private;

revoke all on schema private from public, anon, authenticated;

create table private.rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  edition_key text not null,
  mission_key text not null,
  state_version integer not null,
  state jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint rooms_name_format check (
    name = btrim(name)
    and name ~ '^[A-Za-z0-9 _-]{2,32}$'
  ),
  constraint rooms_edition_key check (
    edition_key in ('planet-nine', 'deep-sea')
  ),
  constraint rooms_mission_key_format check (
    mission_key ~ '^[A-Za-z0-9_:-]{1,32}$'
  ),
  constraint rooms_state_version_positive check (state_version > 0),
  constraint rooms_state_object check (jsonb_typeof(state) = 'object')
);

create unique index rooms_name_case_insensitive_key
  on private.rooms (lower(name));

create index rooms_updated_at_idx
  on private.rooms (updated_at desc);

create table private.room_players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references private.rooms (id) on delete cascade,
  display_name text not null,
  login_key text not null,
  seat smallint not null,
  created_at timestamptz not null default now(),

  constraint room_players_display_name_format check (
    display_name = btrim(display_name)
    and char_length(display_name) between 1 and 32
  ),
  constraint room_players_login_key_format check (
    login_key ~ '^[A-HJ-NP-Z2-9]{6}$'
  ),
  constraint room_players_seat_range check (seat between 1 and 5),
  constraint room_players_room_login_key_key
    unique (room_id, login_key),
  constraint room_players_room_seat_key
    unique (room_id, seat) deferrable initially immediate
);

create unique index room_players_display_name_case_insensitive_key
  on private.room_players (room_id, lower(display_name));

revoke all on all tables in schema private from public, anon, authenticated;
revoke all on all sequences in schema private from public, anon, authenticated;

alter default privileges for role postgres in schema private
  revoke all on tables from public, anon, authenticated;

alter default privileges for role postgres in schema private
  revoke all on sequences from public, anon, authenticated;

alter default privileges for role postgres in schema private
  revoke execute on functions from public, anon, authenticated;
