-- Online appointment bookings (replaces the mailto CTAs)

create table public.appointment_requests (
  id               serial primary key,
  name             text not null,
  school           text not null,
  email            text not null,
  appointment_type text not null check (appointment_type in ('we_visit', 'you_visit', 'online')),
  trip_slug        text,                -- set when booked from a trip page
  consent          boolean not null default false,
  status           text not null default 'new' check (status in ('new', 'contacted', 'closed')),
  created_at       timestamptz not null default now()
);

-- Inserts happen server-side via the service role; everything else is admin-only.
alter table public.appointment_requests enable row level security;

create policy "admin manage appointment requests"
  on public.appointment_requests for all
  using (public.is_admin()) with check (public.is_admin());
