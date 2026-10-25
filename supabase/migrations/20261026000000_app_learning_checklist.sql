-- Travel app: learning challenges with a points leaderboard, and a
-- pre-arrival checklist families tick off, sent to parents by email from
-- the teacher portal.

-- ─── Learning challenges ──────────────────────────────────────────────
-- One per key highlight: what to learn about it, then a multiple-choice
-- question. Students answer once; a right answer earns the points.

create table if not exists public.app_challenges (
  id          serial primary key,
  app_trip_id int not null references public.app_trips(id) on delete cascade,
  date        date,                              -- the day it belongs to (and unlocks on)
  title       text not null,                     -- 'The Colosseum'
  fact        text not null default '',          -- what to learn before answering
  question    text not null,
  options     jsonb not null default '[]',       -- ["…", "…", "…", "…"]
  answer      int not null default 0,            -- index into options
  points      int not null default 10 check (points between 0 and 1000),
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists app_challenges_trip_idx on public.app_challenges (app_trip_id, date, sort_order);

create table if not exists public.app_challenge_answers (
  challenge_id int not null references public.app_challenges(id) on delete cascade,
  member_id    int not null references public.app_members(id) on delete cascade,
  choice       int not null,
  correct      boolean not null,
  points       int not null default 0,
  answered_at  timestamptz not null default now(),
  primary key (challenge_id, member_id)
);
create index if not exists app_challenge_answers_member_idx on public.app_challenge_answers (member_id);

alter table public.app_trips add column if not exists prize text;
alter table public.app_trips add column if not exists challenges_unlock text not null default 'daily';
alter table public.app_trips drop constraint if exists app_trips_challenges_unlock_check;
alter table public.app_trips add constraint app_trips_challenges_unlock_check check (challenges_unlock in ('daily', 'all'));

-- ─── Pre-arrival checklist ────────────────────────────────────────────
-- The same list for every family; each student's ticks are shared by the
-- student and their parent.

create table if not exists public.app_checklist_items (
  id          serial primary key,
  app_trip_id int not null references public.app_trips(id) on delete cascade,
  title       text not null,
  detail      text not null default '',
  due_date    date,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists app_checklist_items_trip_idx on public.app_checklist_items (app_trip_id, sort_order);

create table if not exists public.app_checklist_ticks (
  item_id    int not null references public.app_checklist_items(id) on delete cascade,
  student_id int not null references public.app_members(id) on delete cascade,
  ticked_by  int references public.app_members(id) on delete set null,
  ticked_at  timestamptz not null default now(),
  primary key (item_id, student_id)
);

-- ─── Parents ──────────────────────────────────────────────────────────
-- Teachers add a parent's email to each student in the portal; the app
-- member records which portal student they are, and when the parent was
-- sent their checklist.

alter table public.portal_students add column if not exists parent_name  text;
alter table public.portal_students add column if not exists parent_email text;

alter table public.app_members add column if not exists portal_student_id int references public.portal_students(id) on delete set null;
alter table public.app_members add column if not exists email text;
alter table public.app_members add column if not exists checklist_sent_at timestamptz;

-- Same model as the rest of the app: members reach these only through the
-- server, so the tables are admin-only for direct access.
alter table public.app_challenges        enable row level security;
alter table public.app_challenge_answers enable row level security;
alter table public.app_checklist_items   enable row level security;
alter table public.app_checklist_ticks   enable row level security;

drop policy if exists "admin manage app challenges" on public.app_challenges;
drop policy if exists "admin manage app challenge answers" on public.app_challenge_answers;
drop policy if exists "admin manage app checklist items" on public.app_checklist_items;
drop policy if exists "admin manage app checklist ticks" on public.app_checklist_ticks;
create policy "admin manage app challenges" on public.app_challenges
  for all using (public.is_admin()) with check (public.is_admin());
create policy "admin manage app challenge answers" on public.app_challenge_answers
  for all using (public.is_admin()) with check (public.is_admin());
create policy "admin manage app checklist items" on public.app_checklist_items
  for all using (public.is_admin()) with check (public.is_admin());
create policy "admin manage app checklist ticks" on public.app_checklist_ticks
  for all using (public.is_admin()) with check (public.is_admin());
