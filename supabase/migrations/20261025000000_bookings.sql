-- Confirmation Studio: a confirmed booking.
--
-- A proposal (brochures, kind = 'proposal') is what a school is offered. When
-- the school says yes, it becomes a booking: the one record the team works
-- from until the trip is over. It ties together the three things a confirmed
-- trip needs — the proposal it was sold from, the teacher portal's planning
-- workspace (students, passports, consent, rooming) and the travel app trip
-- (access codes, documents, daily schedule).
--
-- Written only by the Group admin console, with the service role. No policy
-- grants anyone else access.
--
-- Safe to run twice.

create table if not exists public.bookings (
  id               bigint generated always as identity primary key,
  -- Set once the id is known, e.g. ST-2027-0014.
  ref              text unique,
  brochure_id      bigint unique references public.brochures(id) on delete set null,
  title            text not null,
  school_name      text,
  travel_start     date,
  travel_end       date,
  student_count    int,
  status           text not null default 'confirmed'
                   check (status in ('confirmed', 'travelling', 'completed', 'cancelled')),
  portal_trip_id   int unique references public.portal_trips(id) on delete set null,
  app_trip_id      int unique references public.app_trips(id) on delete set null,
  notes            text,
  confirmed_at     timestamptz not null default now(),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists bookings_status_idx on public.bookings (status, travel_start);

drop trigger if exists bookings_updated_at on public.bookings;
create trigger bookings_updated_at before update on public.bookings
  for each row execute function public.set_updated_at();

alter table public.bookings enable row level security;
