-- Editable website copy.
--
-- lib/settings.ts already reads 'site' and 'safety_page' from this table and
-- falls back to the defaults in code, but the table itself was never created —
-- so the home page and the Health & Safety page have been running entirely on
-- those defaults, with no way to change a word without a deploy.
--
-- Values are partial: whatever is saved here is merged over the defaults, so
-- an untouched field keeps the wording that ships with the code.
--
-- Run in the School Trips Supabase SQL editor. Safe to re-run.

create table if not exists site_settings (
  key         text primary key,
  value       jsonb not null default '{}',
  updated_at  timestamptz not null default now()
);

alter table site_settings enable row level security;

-- The public site reads this on every page render.
drop policy if exists "public read site settings" on site_settings;
create policy "public read site settings" on site_settings for select using (true);
