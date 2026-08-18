-- Country master pages: their own photography, and the editorial content that
-- makes the page worth reading rather than a list of trips.

-- Why a school would travel here, in the words a teacher needs.
alter table public.countries add column if not exists intro text;
alter table public.countries add column if not exists education_notes text;
alter table public.countries add column if not exists curriculum_links jsonb not null default '[]';
alter table public.countries add column if not exists climate_summary text;
alter table public.countries add column if not exists seasons jsonb not null default '[]';
alter table public.countries add column if not exists safety_notes text;
alter table public.countries add column if not exists getting_there text;
alter table public.countries add column if not exists useful_phrases jsonb not null default '[]';
alter table public.countries add column if not exists content_updated_at timestamptz;

-- Country photography, kept separate from trip photography so a destination
-- page no longer has to borrow a trip's hero.
create table if not exists public.country_images (
  id                   serial primary key,
  country_id           int not null references public.countries(id) on delete cascade,
  role                 text not null check (role in ('hero', 'gallery')),
  url                  text not null,
  alt_text             text not null default '',
  caption              text,
  width                int,
  height               int,
  bytes                int,
  focal_x              numeric(4,3) not null default 0.5,
  focal_y              numeric(4,3) not null default 0.42,
  source               text,
  source_url           text,
  photographer         text,
  licence              text,
  attribution_required boolean not null default true,
  downloaded_at        timestamptz,
  sort_order           int not null default 0,
  approved             boolean not null default false,
  created_at           timestamptz not null default now()
);
create index if not exists country_images_idx on public.country_images (country_id, role, sort_order);
create unique index if not exists country_images_one_hero
  on public.country_images (country_id) where role = 'hero' and approved;

alter table public.country_images enable row level security;
create policy "public read approved country images" on public.country_images
  for select using (approved or public.is_admin());
create policy "admin manage country images" on public.country_images
  for all using (public.is_admin()) with check (public.is_admin());
