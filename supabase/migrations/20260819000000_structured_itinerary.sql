-- Structured presentation layer over the day-by-day itinerary.
--
-- Nothing here replaces itinerary_days.description: that stays the
-- authoritative text and is still rendered in full. These columns hold a
-- scannable summary extracted from it, so a reader can understand a day in a
-- few seconds and expand for the detail. A day with structured_at IS NULL
-- simply falls back to the previous presentation.

alter table public.itinerary_days add column if not exists display_title    text;
alter table public.itinerary_days add column if not exists summary          text;
alter table public.itinerary_days add column if not exists primary_location text;

-- [{ name, summary, type, location, conditional, conditional_text }]
alter table public.itinerary_days add column if not exists highlights       jsonb not null default '[]';
-- ["Design Technology", "Engineering", ...]
alter table public.itinerary_days add column if not exists learning_focus   jsonb not null default '[]';
-- ["Technology", "Museum", "Landmark", ...]
alter table public.itinerary_days add column if not exists experience_types jsonb not null default '[]';
-- ["Tokyo", "Odaiba", ...]
alter table public.itinerary_days add column if not exists locations        jsonb not null default '[]';
-- ["Breakfast", "Lunch", "Dinner"]
alter table public.itinerary_days add column if not exists meals            jsonb not null default '[]';
-- [{ mode, from, to, note, highlight }]
alter table public.itinerary_days add column if not exists transport        jsonb not null default '[]';
-- ["Subject to ticket availability", ...] — must survive summarisation
alter table public.itinerary_days add column if not exists notices          jsonb not null default '[]';
-- [{ kind, note }] — shown to admins only, to guide review
alter table public.itinerary_days add column if not exists review_flags     jsonb not null default '[]';

alter table public.itinerary_days add column if not exists structured_at    timestamptz;
alter table public.itinerary_days add column if not exists structured_model text;

-- Trip-level rollups, derived from the days above.
-- [{ location, from_day, to_day }]
alter table public.trips add column if not exists journey          jsonb not null default '[]';
-- ["Emerging Technology", "Shinkansen Engineering", ...]
alter table public.trips add column if not exists trip_highlights  jsonb not null default '[]';
alter table public.trips add column if not exists structured_at    timestamptz;

create index if not exists itinerary_days_structured_idx
  on public.itinerary_days (trip_id) where structured_at is not null;
