-- App v2: day highlights, timed itinerary with educational content,
-- broadcast messages, voucher documents.

create table public.app_highlights (
  id          serial primary key,
  app_trip_id int not null references public.app_trips(id) on delete cascade,
  date        date not null,
  caption     text not null,
  image_url   text,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);
create index on public.app_highlights (app_trip_id, date, sort_order);

create table public.app_schedule_items (
  id                  serial primary key,
  app_trip_id         int not null references public.app_trips(id) on delete cascade,
  date                date not null,
  start_time          time not null,
  title               text not null,
  description         text not null default '',
  meeting_place       text,
  meeting_time        time,
  educational_content text,                -- the learning moment used during tours
  created_at          timestamptz not null default now()
);
create index on public.app_schedule_items (app_trip_id, date, start_time);

alter table public.app_highlights     enable row level security;
alter table public.app_schedule_items enable row level security;
create policy "admin manage app highlights" on public.app_highlights
  for all using (public.is_admin()) with check (public.is_admin());
create policy "admin manage app schedule" on public.app_schedule_items
  for all using (public.is_admin()) with check (public.is_admin());

-- Teacher broadcasts to the whole group
alter table public.app_messages drop constraint if exists app_messages_channel_check;
alter table public.app_messages
  add constraint app_messages_channel_check
  check (channel in ('pct', 'family', 'broadcast'));

-- Excursion vouchers as a first-class document kind
alter table public.app_documents drop constraint if exists app_documents_kind_check;
alter table public.app_documents
  add constraint app_documents_kind_check
  check (kind in ('flight', 'hotel', 'ticket', 'map', 'sightseeing', 'voucher', 'other'));
