-- Curated School Trips photography, with the rights metadata each image needs.
-- Replaces the ad-hoc trips.hero_image / trips.gallery fields, which stay in
-- place as a fallback until every trip has been repopulated.

create table if not exists public.trip_images (
  id                   serial primary key,
  trip_id              int not null references public.trips(id) on delete cascade,
  role                 text not null
                       check (role in ('hero', 'gallery', 'card', 'itinerary', 'destination')),
  itinerary_day_id     int references public.itinerary_days(id) on delete set null,

  url                  text not null,          -- hosted copy in trip-images
  thumbnail_url        text,

  alt_text             text not null default '',
  caption              text,
  location             text,
  activity             text,

  width                int,
  height               int,
  bytes                int,

  -- 0–1, where the subject sits, so crops keep it visible at every breakpoint
  focal_x              numeric(4,3) not null default 0.5,
  focal_y              numeric(4,3) not null default 0.5,

  source               text,                   -- e.g. 'Wikimedia Commons'
  source_url           text,
  photographer         text,
  licence              text,
  attribution_required boolean not null default true,
  downloaded_at        timestamptz,

  sort_order           int not null default 0,
  approved             boolean not null default false,
  created_at           timestamptz not null default now()
);

create index if not exists trip_images_trip_idx on public.trip_images (trip_id, role, sort_order);
-- One approved hero per trip.
create unique index if not exists trip_images_one_hero
  on public.trip_images (trip_id) where role = 'hero' and approved;

alter table public.trip_images enable row level security;

create policy "public read approved trip images" on public.trip_images
  for select using (approved or public.is_admin());
create policy "admin manage trip images" on public.trip_images
  for all using (public.is_admin()) with check (public.is_admin());
