-- A photo per itinerary day. The trip page shows these in a sticky panel that
-- follows the day you are reading; days without one fall back to the hero image.
alter table public.itinerary_days add column if not exists image_url text;
alter table public.itinerary_days add column if not exists image_alt text;
