-- Teacher portal, phase 2: the planning workspace.
-- Holds student records, passport and consent documents, rooming and
-- dietary/medical notes for a confirmed trip.

create table if not exists public.portal_trips (
  id             serial primary key,
  quote_id       int references public.quotes(id) on delete set null,
  title          text not null,
  school_name    text not null,
  travel_dates   text,
  departure_date date,
  status         text not null default 'planning'
                 check (status in ('planning', 'ready', 'travelling', 'completed')),
  paperwork_due  date,
  notes          text,
  data_purged_at timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create trigger portal_trips_updated_at before update on public.portal_trips
  for each row execute function public.set_updated_at();

-- Which teachers may open a given trip. Admin decides; colleagues at the same
-- school only see a trip if they are added here.
create table if not exists public.portal_trip_teachers (
  portal_trip_id int not null references public.portal_trips(id) on delete cascade,
  teacher_id     int not null references public.portal_teachers(id) on delete cascade,
  primary key (portal_trip_id, teacher_id)
);

create table if not exists public.portal_students (
  id                      serial primary key,
  portal_trip_id          int not null references public.portal_trips(id) on delete cascade,
  full_name               text not null,
  date_of_birth           date,
  year_group              text,
  nationality             text,
  passport_number         text,
  passport_expiry         date,
  passport_file           text,   -- object path in the private portal-docs bucket
  consent_file            text,
  dietary                 text,
  medical                 text,
  emergency_contact_name  text,
  emergency_contact_phone text,
  room_group              text,
  notes                   text,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);
create index if not exists portal_students_trip_idx on public.portal_students (portal_trip_id, full_name);
create trigger portal_students_updated_at before update on public.portal_students
  for each row execute function public.set_updated_at();

alter table public.portal_trips         enable row level security;
alter table public.portal_trip_teachers enable row level security;
alter table public.portal_students      enable row level security;

-- Teachers never reach these tables directly: the portal reads and writes them
-- server-side with the service role after checking the session. Admins manage
-- them through the panel.
create policy "admin manage portal trips" on public.portal_trips
  for all using (public.is_admin()) with check (public.is_admin());
create policy "admin manage portal trip teachers" on public.portal_trip_teachers
  for all using (public.is_admin()) with check (public.is_admin());
create policy "admin manage portal students" on public.portal_students
  for all using (public.is_admin()) with check (public.is_admin());

-- Passports and consent forms are personal data: a PRIVATE bucket, unlike the
-- public trip-images one. Files are only ever served through short-lived
-- signed URLs generated server-side.
insert into storage.buckets (id, name, public)
values ('portal-docs', 'portal-docs', false)
on conflict (id) do nothing;

create policy "admin read portal docs" on storage.objects
  for select using (bucket_id = 'portal-docs' and public.is_admin());
create policy "admin write portal docs" on storage.objects
  for insert with check (bucket_id = 'portal-docs' and public.is_admin());
create policy "admin delete portal docs" on storage.objects
  for delete using (bucket_id = 'portal-docs' and public.is_admin());
