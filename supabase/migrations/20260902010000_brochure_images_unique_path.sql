-- One row per stored file.
--
-- Two brochure_images rows pointing at the same object in Storage is always a
-- mistake: deleting one would orphan the other's image. The seed works without
-- this (it clears its own rows before inserting), so it is not urgent — but it
-- closes the gap for images added through the admin later, and lets callers
-- upsert on storage_path.
--
-- Run in the School Trips SQL editor. Safe to re-run.

create unique index if not exists brochure_images_storage_path_key
  on brochure_images (storage_path);
