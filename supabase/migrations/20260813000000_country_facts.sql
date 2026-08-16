-- At-a-glance facts shown beside the trip overview.
-- Populated from the admin (Claude drafts them, average temperature is measured
-- from Open-Meteo records) and editable by hand afterwards.
alter table public.countries add column if not exists capital text;
alter table public.countries add column if not exists currency text;
alter table public.countries add column if not exists languages text;
alter table public.countries add column if not exists timezone text;
alter table public.countries add column if not exists population text;
alter table public.countries add column if not exists avg_temp_c numeric(4,1);
alter table public.countries add column if not exists best_time text;
alter table public.countries add column if not exists facts_updated_at timestamptz;
