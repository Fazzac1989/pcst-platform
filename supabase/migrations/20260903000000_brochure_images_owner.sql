-- Photographs belong to a proposal.
--
-- brochure_images began as one shared library, so every proposal's studio
-- offered every photograph ever uploaded — a new proposal opened with another
-- trip's pictures on offer. Each image now records which proposal it was
-- uploaded for, and the studio shows only those.
--
-- The backfill gives existing images to whichever proposal already uses them:
-- in a day, as the hero, or in a signature experience. Images nobody uses
-- keep a null owner and simply stop appearing.
--
-- Run in the School Trips SQL editor. Safe to re-run.

alter table brochure_images
  add column if not exists brochure_id bigint references brochures(id) on delete cascade;

create index if not exists brochure_images_brochure_idx on brochure_images (brochure_id);

-- Days: image_ids is a jsonb array of image ids.
update brochure_images i
set brochure_id = r.brochure_id
from (
  select distinct d.brochure_id, (jsonb_array_elements_text(d.image_ids))::bigint as image_id
  from brochure_days d
  where jsonb_typeof(d.image_ids) = 'array'
) r
where i.id = r.image_id and i.brochure_id is null;

-- The hero, stored in the content document.
update brochure_images i
set brochure_id = b.id
from brochures b
where i.brochure_id is null
  and b.content->>'heroImageId' ~ '^[0-9]+$'
  and (b.content->>'heroImageId')::bigint = i.id;

-- Signature experiences, each with an optional imageId.
update brochure_images i
set brochure_id = r.brochure_id
from (
  select b.id as brochure_id, (e->>'imageId')::bigint as image_id
  from brochures b,
       jsonb_array_elements(coalesce(b.content->'signatureExperiences', '[]'::jsonb)) e
  where e->>'imageId' ~ '^[0-9]+$'
) r
where i.id = r.image_id and i.brochure_id is null;
