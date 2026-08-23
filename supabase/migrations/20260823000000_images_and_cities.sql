-- Consolidate photography onto the records themselves, and give cities their
-- own pages.
--
-- The curated-image tables (trip_images, country_images) held a parallel
-- library that the admin could not edit directly: an image removed on the trip
-- form stayed on the public page because the curated row still won. Everything
-- now lives on the trip or the country, edited in one place and uploaded (or
-- licensed from Shutterstock) through the same field.
--
-- This migration is additive and copies the curated rows across. The old
-- tables are dropped by 20260823000001_drop_curated_images.sql, which must be
-- run only once the new code is live.

/* ------------------------------------------------------------------ */
/* Countries own their photography, exactly as trips already do.       */
/* ------------------------------------------------------------------ */

alter table public.countries add column if not exists hero_image text;
alter table public.countries add column if not exists hero_alt   text;
alter table public.countries add column if not exists gallery    jsonb not null default '[]';

/* ------------------------------------------------------------------ */
/* Cities: a sub-destination page, with the same editorial shape as a  */
/* country so the two read as one family.                              */
/* ------------------------------------------------------------------ */

create table if not exists public.cities (
  id                 serial primary key,
  name               text not null,
  slug               text not null unique,
  country_id         int references public.countries(id) on delete set null,
  intro              text,
  education_notes    text,
  curriculum_links   jsonb not null default '[]',
  climate_summary    text,
  seasons            jsonb not null default '[]',
  getting_around     text,
  useful_phrases     jsonb not null default '[]',
  hero_image         text,
  hero_alt           text,
  gallery            jsonb not null default '[]',
  content_updated_at timestamptz,
  created_at         timestamptz not null default now()
);
create index if not exists cities_country_idx on public.cities (country_id);

alter table public.cities enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'cities' and policyname = 'public read cities') then
    create policy "public read cities" on public.cities for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'cities' and policyname = 'admin manage cities') then
    create policy "admin manage cities" on public.cities
      for all using (public.is_admin()) with check (public.is_admin());
  end if;
end $$;

/* ------------------------------------------------------------------ */
/* Carry the curated photography over before the tables are retired.   */
/* Only approved rows: the rest were candidates nobody accepted.       */
/* ------------------------------------------------------------------ */

do $$
begin
  if to_regclass('public.trip_images') is not null then
    -- Hero: only where the trip has not been given one by hand.
    update public.trips t
       set hero_image = i.url,
           hero_alt   = coalesce(nullif(t.hero_alt, ''), i.alt_text)
      from public.trip_images i
     where i.trip_id = t.id
       and i.role = 'hero'
       and i.approved
       and coalesce(t.hero_image, '') = '';

    -- Gallery: only where the trip's own gallery is still empty.
    update public.trips t
       set gallery = g.items
      from (
        select trip_id,
               jsonb_agg(jsonb_build_object('url', url, 'alt', alt_text) order by sort_order, id) as items
          from public.trip_images
         where role = 'gallery' and approved
         group by trip_id
      ) g
     where g.trip_id = t.id
       and coalesce(jsonb_array_length(t.gallery), 0) = 0;
  end if;

  if to_regclass('public.country_images') is not null then
    update public.countries c
       set hero_image = i.url,
           hero_alt   = i.alt_text
      from public.country_images i
     where i.country_id = c.id
       and i.role = 'hero'
       and i.approved
       and coalesce(c.hero_image, '') = '';

    update public.countries c
       set gallery = g.items
      from (
        select country_id,
               jsonb_agg(jsonb_build_object('url', url, 'alt', alt_text) order by sort_order, id) as items
          from public.country_images
         where role = 'gallery' and approved
         group by country_id
      ) g
     where g.country_id = c.id
       and coalesce(jsonb_array_length(c.gallery), 0) = 0;
  end if;
end $$;
