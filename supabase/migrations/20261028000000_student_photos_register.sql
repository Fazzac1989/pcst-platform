-- Teacher's command centre: a photo for each student (kept in the private
-- portal-docs bucket with their passport and consent form, and removed with
-- them when the trip's data is purged), and the daily register.

alter table public.portal_students add column if not exists photo_file text;

create table if not exists public.app_register (
  app_trip_id int not null references public.app_trips(id) on delete cascade,
  date        date not null,
  student_id  int not null references public.app_members(id) on delete cascade,
  status      text not null check (status in ('present', 'absent')),
  marked_by   int references public.app_members(id) on delete set null,
  marked_at   timestamptz not null default now(),
  primary key (date, student_id)
);
create index if not exists app_register_trip_idx on public.app_register (app_trip_id, date);

alter table public.app_register enable row level security;
drop policy if exists "admin manage app register" on public.app_register;
create policy "admin manage app register" on public.app_register
  for all using (public.is_admin()) with check (public.is_admin());
