-- Travel companion app (Vamoos-style PWA): trips pushed from confirmed quotes,
-- code-based member logins in three layers (teacher / student / parent),
-- documents, photo feed and role-scoped messaging.

create table public.app_trips (
  id            serial primary key,
  quote_id      int references public.quotes(id) on delete set null,
  title         text not null,
  destination   text not null,                 -- 'Reykjavik, Iceland' — drives weather
  start_date    date,
  end_date      date,
  hero_image    text,
  itinerary     jsonb not null default '[]',
  contacts      jsonb not null default '[]',   -- [{label, phone}] teacher layer
  confirmations jsonb not null default '[]',   -- [{label, ref}] teacher layer
  status        text not null default 'active' check (status in ('active', 'archived')),
  created_at    timestamptz not null default now()
);

create table public.app_members (
  id          serial primary key,
  app_trip_id int not null references public.app_trips(id) on delete cascade,
  role        text not null check (role in ('teacher', 'student', 'parent')),
  name        text not null,
  login_code  text not null unique,            -- personal access code, e.g. ICE24-S-7GK4QZ
  parent_of   int references public.app_members(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index on public.app_members (app_trip_id, role);

create table public.app_posts (
  id          serial primary key,
  app_trip_id int not null references public.app_trips(id) on delete cascade,
  member_id   int not null references public.app_members(id) on delete cascade,
  image_url   text,
  caption     text,
  created_at  timestamptz not null default now()
);
create index on public.app_posts (app_trip_id, created_at desc);

create table public.app_messages (
  id               serial primary key,
  app_trip_id      int not null references public.app_trips(id) on delete cascade,
  channel          text not null check (channel in ('pct', 'family')),
  student_id       int references public.app_members(id) on delete cascade,  -- family channel anchor
  sender_member_id int references public.app_members(id) on delete set null, -- null = PCT team
  body             text not null,
  created_at       timestamptz not null default now()
);
create index on public.app_messages (app_trip_id, channel, student_id, created_at);

create table public.app_documents (
  id          serial primary key,
  app_trip_id int not null references public.app_trips(id) on delete cascade,
  member_id   int references public.app_members(id) on delete cascade,  -- per-student (e-tickets); null = group
  scope       text not null default 'all' check (scope in ('all', 'teacher')),
  kind        text not null default 'other' check (kind in ('flight', 'hotel', 'ticket', 'map', 'sightseeing', 'other')),
  title       text not null,
  file_url    text not null,
  created_at  timestamptz not null default now()
);
create index on public.app_documents (app_trip_id);

-- All app access is server-mediated: members authenticate with their login
-- code (held in an http-only cookie) and every query runs through the
-- service role after resolving the member. RLS keeps the tables admin-only
-- for direct API access.
alter table public.app_trips     enable row level security;
alter table public.app_members   enable row level security;
alter table public.app_posts     enable row level security;
alter table public.app_messages  enable row level security;
alter table public.app_documents enable row level security;

create policy "admin manage app trips"     on public.app_trips     for all using (public.is_admin()) with check (public.is_admin());
create policy "admin manage app members"   on public.app_members   for all using (public.is_admin()) with check (public.is_admin());
create policy "admin manage app posts"     on public.app_posts     for all using (public.is_admin()) with check (public.is_admin());
create policy "admin manage app messages"  on public.app_messages  for all using (public.is_admin()) with check (public.is_admin());
create policy "admin manage app documents" on public.app_documents for all using (public.is_admin()) with check (public.is_admin());
