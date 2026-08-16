-- Photo gallery per trip: up to 6 images shown on the public trip page.
-- Each entry is {"url": "...", "alt": "..."} so every image carries alt text
-- for screen readers and search engines.
alter table public.trips add column if not exists gallery jsonb not null default '[]';

-- Alt text for the existing hero image.
alter table public.trips add column if not exists hero_alt text;
