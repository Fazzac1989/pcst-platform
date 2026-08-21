-- Site settings: the words and switches of the public site, editable from the
-- group console instead of living in code.
--
-- One row per area ('site', 'safety_page', …), each a jsonb document. The code
-- carries full defaults and merges the stored document over them, so a missing
-- row — or this migration not having run yet — renders the site exactly as
-- before, and a new field never requires another migration.

create table if not exists public.site_settings (
  key        text primary key,
  value      jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

alter table public.site_settings enable row level security;

-- The public site reads settings at render time.
create policy "public read site settings" on public.site_settings
  for select using (true);

create policy "admin manage site settings" on public.site_settings
  for all using (public.is_admin()) with check (public.is_admin());
