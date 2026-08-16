-- Teacher portal, phase 1: invited accounts and quote acceptance.
-- Teachers are invited by an admin; there is no self-registration.

create table if not exists public.portal_teachers (
  id           serial primary key,
  user_id      uuid unique references auth.users(id) on delete set null,
  email        text not null unique,
  name         text not null,
  school_name  text not null,
  status       text not null default 'invited' check (status in ('invited', 'active', 'disabled')),
  invited_at   timestamptz not null default now(),
  accepted_at  timestamptz,
  last_seen_at timestamptz
);
create index if not exists portal_teachers_email_idx on public.portal_teachers (lower(email));

alter table public.portal_teachers enable row level security;

-- Teachers never query this table directly; portal pages read it server-side
-- with the service role after verifying the session. Admins manage it here.
create policy "admin manage portal teachers" on public.portal_teachers
  for all using (public.is_admin()) with check (public.is_admin());

-- When a teacher accepted the quote, so the admin can see it at a glance.
alter table public.quotes add column if not exists accepted_at timestamptz;
