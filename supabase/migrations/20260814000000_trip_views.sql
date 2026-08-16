-- Lightweight, cookie-less view tracking for trip pages.
-- One row per page view; dwell seconds are filled in when the visitor leaves.
create table if not exists public.trip_views (
  id           bigserial primary key,
  trip_id      int not null references public.trips(id) on delete cascade,
  viewed_at    timestamptz not null default now(),
  dwell_seconds int,
  referrer     text
);
create index if not exists trip_views_trip_idx on public.trip_views (trip_id, viewed_at desc);
create index if not exists trip_views_viewed_idx on public.trip_views (viewed_at desc);

alter table public.trip_views enable row level security;

-- Writes are server-mediated with the service role; reads are admin-only.
create policy "admin read trip views" on public.trip_views
  for select using (public.is_admin());

-- Aggregated leaderboard: views and median-ish dwell per trip.
create or replace function public.trip_view_stats(since timestamptz)
returns table (
  trip_id int,
  views bigint,
  avg_dwell_seconds numeric,
  total_dwell_seconds numeric,
  last_viewed timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    v.trip_id,
    count(*) as views,
    round(avg(v.dwell_seconds) filter (where v.dwell_seconds is not null), 1) as avg_dwell_seconds,
    coalesce(sum(v.dwell_seconds), 0) as total_dwell_seconds,
    max(v.viewed_at) as last_viewed
  from public.trip_views v
  where v.viewed_at >= since
  group by v.trip_id
  order by count(*) desc;
$$;

revoke all on function public.trip_view_stats(timestamptz) from public, anon;
grant execute on function public.trip_view_stats(timestamptz) to authenticated;
