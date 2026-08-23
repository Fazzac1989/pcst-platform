-- Retire the curated-image library.
--
-- RUN THIS ONLY AFTER the code that reads trip_images / country_images is
-- live. A PostgREST select naming a dropped relation fails the whole query,
-- so dropping these while the old code is still deployed would take trip
-- pages, country pages and the brochure builder down with it.
--
-- 20260823000000_images_and_cities.sql has already copied every approved row
-- onto trips.hero_image / trips.gallery and countries.hero_image /
-- countries.gallery, so nothing published is lost here.
--
-- The files themselves stay in the trip-images bucket: the copied rows point
-- at those same URLs.

drop table if exists public.trip_images;
drop table if exists public.country_images;
