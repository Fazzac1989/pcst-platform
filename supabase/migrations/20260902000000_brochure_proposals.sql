-- Brochure Studio, phase 1 — proposals.
--
-- Extends the existing brochure system rather than standing a second one
-- beside it. `brochures` already carries client_name, client_logo, status,
-- visibility, password_hash and published_at, so "a brochure prepared for one
-- school" is largely modelled; a proposal is that plus a day-by-day itinerary,
-- flights, commercial terms and a share link.
--
-- New tables cover only what genuinely does not exist. Existing marketing
-- brochures are untouched: every column added here is nullable, and the page
-- block model still drives kind = 'brochure'.
--
-- Reversible: the down section at the foot drops exactly what this adds.

/* ─────────────────────── brochures: proposal fields ─────────────────────── */

-- Which school this is for. Nullable, and no FK yet: the schools table is
-- still empty, and a proposal must be draftable before a school record exists.
alter table brochures add column if not exists school_id bigint;
alter table brochures add column if not exists prepared_for text;

alter table brochures add column if not exists travel_start date;
alter table brochures add column if not exists travel_end date;
alter table brochures add column if not exists student_count int;
alter table brochures add column if not exists free_places_teachers int;
alter table brochures add column if not exists free_places_pct_staff int;

alter table brochures add column if not exists price_per_student numeric;
alter table brochures add column if not exists currency text default 'AED';
alter table brochures add column if not exists price_basis_note text;

-- Field-level overrides for a proposal built from another brochure, so a
-- school-specific change never edits the source.
alter table brochures add column if not exists overrides jsonb not null default '{}';

-- Unguessable share link. Unique where present so two proposals cannot collide.
alter table brochures add column if not exists share_token text;
alter table brochures add column if not exists share_expires_at timestamptz;
create unique index if not exists brochures_share_token_key on brochures (share_token)
  where share_token is not null;

alter table brochures add column if not exists pdf_storage_path text;
alter table brochures add column if not exists pdf_generated_at timestamptz;
alter table brochures add column if not exists sent_at timestamptz;
alter table brochures add column if not exists first_viewed_at timestamptz;
alter table brochures add column if not exists view_count int not null default 0;

-- Snowfall on the hero: per-proposal, because it suits Lapland and not Rome.
alter table brochures add column if not exists hero_effect boolean not null default false;

alter table brochures add column if not exists terms_set_id bigint;

/* ────────────────────────────── the itinerary ───────────────────────────── */

create table if not exists brochure_days (
  id          bigserial primary key,
  brochure_id bigint not null references brochures(id) on delete cascade,
  day_number  int not null,
  date        date,
  title       text not null default '',
  -- The paragraph that reads as prose above the timetable.
  summary     text not null default '',
  overnight   text,
  image_ids   jsonb not null default '[]',
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists brochure_days_brochure_idx on brochure_days (brochure_id, sort_order);

create table if not exists brochure_day_items (
  id          bigserial primary key,
  day_id      bigint not null references brochure_days(id) on delete cascade,
  -- Free text on purpose: "Late morning" and "09:00–12:00" are both valid.
  time_label  text not null default '',
  -- Limited HTML; <b> carries the venue and flight emphasis in the reference.
  text        text not null default '',
  sort_order  int not null default 0
);
create index if not exists brochure_day_items_day_idx on brochure_day_items (day_id, sort_order);

create table if not exists brochure_flights (
  id            bigserial primary key,
  brochure_id   bigint not null references brochures(id) on delete cascade,
  direction     text not null default 'outbound',
  flight_number text,
  carrier       text,
  from_code     text,
  from_name     text,
  to_code       text,
  to_name       text,
  departs_at    timestamptz,
  arrives_at    timestamptz,
  note          text,
  sort_order    int not null default 0
);
alter table brochure_flights drop constraint if exists brochure_flights_direction_check;
alter table brochure_flights add constraint brochure_flights_direction_check
  check (direction in ('outbound', 'return'));
create index if not exists brochure_flights_brochure_idx on brochure_flights (brochure_id, sort_order);

/* ───────────────────────── booking conditions ───────────────────────────── */

-- Versioned rather than editable in place: a sent proposal must keep showing
-- the conditions it was sent with, so editing a set in use creates a version.
create table if not exists brochure_terms_sets (
  id             bigserial primary key,
  name           text not null,
  version        int not null default 1,
  sections       jsonb not null default '[]',
  is_default     boolean not null default false,
  effective_from date,
  created_at     timestamptz not null default now()
);
create index if not exists brochure_terms_sets_default_idx on brochure_terms_sets (is_default);

/* ──────────────────────────────── images ───────────────────────────────── */

create table if not exists brochure_images (
  id           bigserial primary key,
  storage_path text not null,
  alt          text not null default '',
  credit       text,
  width        int,
  height       int,
  tags         jsonb not null default '[]',
  created_at   timestamptz not null default now()
);
create index if not exists brochure_images_tags_idx on brochure_images using gin (tags);

/* ───────────────────────────── audit trail ─────────────────────────────── */

create table if not exists proposal_events (
  id          bigserial primary key,
  brochure_id bigint not null references brochures(id) on delete cascade,
  event       text not null,
  metadata    jsonb not null default '{}',
  created_at  timestamptz not null default now()
);
alter table proposal_events drop constraint if exists proposal_events_event_check;
alter table proposal_events add constraint proposal_events_event_check
  check (event in ('created', 'sent', 'viewed', 'pdf_downloaded', 'accepted'));
create index if not exists proposal_events_brochure_idx on proposal_events (brochure_id, created_at desc);

/* ──────────────────────────────── access ───────────────────────────────── */

-- Staff reach everything through the service role, which bypasses RLS. The
-- public site renders a proposal through a server route that checks the share
-- token and its expiry, so none of these tables is readable anonymously.
alter table brochure_days enable row level security;
alter table brochure_day_items enable row level security;
alter table brochure_flights enable row level security;
alter table brochure_terms_sets enable row level security;
alter table brochure_images enable row level security;
alter table proposal_events enable row level security;

-- Images are referenced by public URL from the storage bucket, so their rows
-- may be read; the bucket itself is what serves the file.
drop policy if exists "public read brochure images" on brochure_images;
create policy "public read brochure images" on brochure_images for select using (true);

/* ──────────────────────────────── storage ──────────────────────────────── */

insert into storage.buckets (id, name, public)
values ('brochure-images', 'brochure-images', true)
on conflict (id) do nothing;

drop policy if exists "public read brochure-images" on storage.objects;
create policy "public read brochure-images" on storage.objects
  for select using (bucket_id = 'brochure-images');

/* ─────────────────────────────── rollback ──────────────────────────────── */
--
-- drop table if exists proposal_events;
-- drop table if exists brochure_images;
-- drop table if exists brochure_terms_sets;
-- drop table if exists brochure_flights;
-- drop table if exists brochure_day_items;
-- drop table if exists brochure_days;
-- alter table brochures
--   drop column if exists school_id, drop column if exists prepared_for,
--   drop column if exists travel_start, drop column if exists travel_end,
--   drop column if exists student_count, drop column if exists free_places_teachers,
--   drop column if exists free_places_pct_staff, drop column if exists price_per_student,
--   drop column if exists currency, drop column if exists price_basis_note,
--   drop column if exists overrides, drop column if exists share_token,
--   drop column if exists share_expires_at, drop column if exists pdf_storage_path,
--   drop column if exists pdf_generated_at, drop column if exists sent_at,
--   drop column if exists first_viewed_at, drop column if exists view_count,
--   drop column if exists hero_effect, drop column if exists terms_set_id;
