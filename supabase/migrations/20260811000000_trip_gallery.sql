-- Photo gallery per trip (up to 6 image URLs, shown on the public trip page)
alter table public.trips add column gallery jsonb not null default '[]';
