-- A brochure sent to one teacher.
--
-- The brochure itself is one page for everyone. An invite is the personal
-- front door to it: the teacher's name, their school's logo, a message from
-- us, and a button. Each has its own token, so the link can be handed to one
-- person and we can see when they opened it. A valid invite also opens a
-- password-protected brochure, so a teacher is never asked for a password
-- we would only have had to email them anyway.
--
-- Run in the School Trips SQL editor. Safe to re-run.

create table if not exists brochure_invites (
  id               bigserial primary key,
  brochure_id      bigint not null references brochures(id) on delete cascade,
  token            text not null unique,
  teacher_name     text not null,
  school_name      text not null default '',
  logo_image_id    bigint references brochure_images(id) on delete set null,
  message          text not null default '',
  email            text,
  created_at       timestamptz not null default now(),
  sent_at          timestamptz,
  first_opened_at  timestamptz,
  last_opened_at   timestamptz,
  open_count       int not null default 0
);

create index if not exists brochure_invites_brochure_idx on brochure_invites (brochure_id);

-- Read and written through the service role only; nothing here is public
-- until the page decides what to show.
alter table brochure_invites enable row level security;
