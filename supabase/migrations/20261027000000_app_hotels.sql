-- Travel app: the hotels a trip stays in, shown on the Accommodation tab with
-- each student's room from the rooming list.
-- [{ name, address, phone, from, to, wifi, notes }]
alter table public.app_trips add column if not exists hotels jsonb not null default '[]';
