-- Quote builder: extend the Phase 2 quotes tables for standalone quotes with
-- per-line supplier costings/markups, personalisation, public share links and
-- a teacher message thread.

alter table public.quotes
  alter column school_id drop not null,
  alter column trip_id drop not null;

alter table public.quotes
  add column public_token uuid not null default gen_random_uuid(),
  add column school_name text,
  add column school_logo text,
  add column teacher_name text,
  add column teacher_email text,
  add column currency text not null default 'AED',
  add column default_markup_pct numeric(6,2) not null default 0,
  add column itinerary jsonb not null default '[]',
  add column images jsonb not null default '[]',
  add column terms jsonb not null default '[]',
  add column updated_at timestamptz not null default now();

alter table public.quotes add constraint quotes_public_token_key unique (public_token);

create trigger quotes_updated_at before update on public.quotes
  for each row execute function public.set_updated_at();

-- Supplier cost + markup per line; unit_price remains the computed sell price
alter table public.quote_lines
  add column unit_cost numeric(12,2) not null default 0,
  add column markup_pct numeric(6,2) not null default 0;

-- Teacher <-> admin message thread per quote
create table public.quote_messages (
  id         serial primary key,
  quote_id   int not null references public.quotes(id) on delete cascade,
  sender     text not null check (sender in ('teacher', 'admin')),
  author     text,
  body       text not null,
  created_at timestamptz not null default now()
);
create index on public.quote_messages (quote_id, created_at);

alter table public.quote_messages enable row level security;

-- Public access is mediated server-side by the unguessable token; tables stay
-- admin-only at the RLS layer.
create policy "admin manage quote messages"
  on public.quote_messages for all
  using (public.is_admin()) with check (public.is_admin());
