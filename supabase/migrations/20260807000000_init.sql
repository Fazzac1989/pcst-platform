-- Premium Choice School Trips — initial schema (adapted from reference/schema.sql for Supabase)
-- Phase 1: public site content (trips CMS) — in use now
-- Phase 2: school portal (accounts, enquiries, quotes) — created, locked to admin, unused

-- ============ PHASE 1 — CONTENT ============

create table public.subjects (
  id          serial primary key,
  name        text not null unique,
  slug        text not null unique
);

create table public.countries (
  id          serial primary key,
  name        text not null unique,
  slug        text not null unique,
  region      text                            -- 'Europe','Asia','Africa','Americas','Oceania','Middle East'
);

create table public.trips (
  id              serial primary key,
  slug            text not null unique,
  title           text not null,
  subject_id      int references public.subjects(id),
  country_id      int references public.countries(id),
  city            text,
  duration_days   int not null,
  duration_nights int not null,
  departs         text not null default 'Dubai',
  hero_image      text,
  overview        jsonb not null default '[]',
  includes        jsonb not null default '[]',
  base_price_pp   numeric(10,2),              -- optional, portal-only (never public)
  status          text not null default 'draft' check (status in ('draft','published','archived')),
  featured        boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table public.itinerary_days (
  id          serial primary key,
  trip_id     int not null references public.trips(id) on delete cascade,
  sort_order  int not null,
  label       text,
  title       text not null,
  description text not null,
  unique (trip_id, sort_order)
);
create index on public.itinerary_days (trip_id, sort_order);

create table public.booking_terms (
  id          serial primary key,
  sort_order  int not null unique,
  text        text not null
);

-- keep updated_at fresh
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger trips_updated_at before update on public.trips
  for each row execute function public.set_updated_at();

-- ============ PROFILES (Supabase Auth replaces the schema's users table) ============

create table public.schools (
  id           serial primary key,
  name         text not null,
  email_domain text not null unique,
  contact_name text,
  status       text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at   timestamptz not null default now()
);

create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  role       text not null default 'school' check (role in ('admin','school')),
  school_id  int references public.schools(id),
  created_at timestamptz not null default now()
);

-- ============ PHASE 2 — SCHOOL PORTAL (unused for now) ============

create table public.enquiries (
  id               serial primary key,
  ref              text not null unique,
  school_id        int not null references public.schools(id),
  profile_id       uuid references public.profiles(id),
  trip_id          int not null references public.trips(id),
  departure_date   date,
  flexibility      text,
  pupils           int not null,
  staff            int not null,
  year_group       text,
  inclusions       jsonb not null default '{}',
  indicative_total numeric(12,2),
  notes            text,
  status           text not null default 'new' check (status in ('new','in_progress','quoted','closed')),
  created_at       timestamptz not null default now()
);

create table public.quotes (
  id           serial primary key,
  ref          text not null unique,
  enquiry_id   int references public.enquiries(id),
  school_id    int not null references public.schools(id),
  trip_id      int not null references public.trips(id),
  title        text not null,
  travel_dates text,
  pupils       int,
  staff        int,
  validity     date,
  notes        text,
  status       text not null default 'draft' check (status in ('draft','published','accepted','expired','withdrawn')),
  published_at timestamptz,
  created_at   timestamptz not null default now()
);

create table public.quote_lines (
  id          serial primary key,
  quote_id    int not null references public.quotes(id) on delete cascade,
  sort_order  int not null,
  description text not null,
  qty         int not null default 1,
  unit_price  numeric(12,2) not null default 0
);
create index on public.quote_lines (quote_id, sort_order);

create view public.quote_totals as
select q.id as quote_id, q.ref, sum(l.qty * l.unit_price) as total
from public.quotes q join public.quote_lines l on l.quote_id = q.id
group by q.id, q.ref;

-- ============ ROW LEVEL SECURITY ============

-- Helper: is the current user an admin? SECURITY DEFINER avoids RLS recursion.
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

alter table public.subjects       enable row level security;
alter table public.countries      enable row level security;
alter table public.trips          enable row level security;
alter table public.itinerary_days enable row level security;
alter table public.booking_terms  enable row level security;
alter table public.profiles       enable row level security;
alter table public.schools        enable row level security;
alter table public.enquiries      enable row level security;
alter table public.quotes         enable row level security;
alter table public.quote_lines    enable row level security;

-- Public (anon + authenticated) read: published content only
create policy "public read published trips"
  on public.trips for select
  using (status = 'published' or public.is_admin());

create policy "public read itinerary of published trips"
  on public.itinerary_days for select
  using (
    exists (select 1 from public.trips t where t.id = trip_id and t.status = 'published')
    or public.is_admin()
  );

create policy "public read subjects of published trips"
  on public.subjects for select
  using (
    exists (select 1 from public.trips t where t.subject_id = id and t.status = 'published')
    or public.is_admin()
  );

create policy "public read countries of published trips"
  on public.countries for select
  using (
    exists (select 1 from public.trips t where t.country_id = id and t.status = 'published')
    or public.is_admin()
  );

create policy "public read booking terms"
  on public.booking_terms for select
  using (true);

-- Admin write on content tables
create policy "admin write trips"          on public.trips          for all using (public.is_admin()) with check (public.is_admin());
create policy "admin write itinerary"      on public.itinerary_days for all using (public.is_admin()) with check (public.is_admin());
create policy "admin write subjects"       on public.subjects       for all using (public.is_admin()) with check (public.is_admin());
create policy "admin write countries"      on public.countries      for all using (public.is_admin()) with check (public.is_admin());
create policy "admin write booking terms"  on public.booking_terms  for all using (public.is_admin()) with check (public.is_admin());

-- Profiles: users read their own row; admins manage all
create policy "own profile read" on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy "admin manage profiles" on public.profiles for all using (public.is_admin()) with check (public.is_admin());

-- Phase 2 tables: locked to admin for now
create policy "admin only schools"     on public.schools     for all using (public.is_admin()) with check (public.is_admin());
create policy "admin only enquiries"   on public.enquiries   for all using (public.is_admin()) with check (public.is_admin());
create policy "admin only quotes"      on public.quotes      for all using (public.is_admin()) with check (public.is_admin());
create policy "admin only quote lines" on public.quote_lines for all using (public.is_admin()) with check (public.is_admin());

-- ============ STORAGE ============

insert into storage.buckets (id, name, public)
values ('trip-images', 'trip-images', true)
on conflict (id) do nothing;

create policy "public read trip images"
  on storage.objects for select
  using (bucket_id = 'trip-images');

create policy "admin insert trip images"
  on storage.objects for insert
  with check (bucket_id = 'trip-images' and public.is_admin());

create policy "admin update trip images"
  on storage.objects for update
  using (bucket_id = 'trip-images' and public.is_admin());

create policy "admin delete trip images"
  on storage.objects for delete
  using (bucket_id = 'trip-images' and public.is_admin());
