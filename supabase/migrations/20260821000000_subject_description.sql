-- A short write-up for each subject, shown at the top of its public page.
-- Written once (by hand or by the backfill script) and editable in the admin;
-- pages simply skip the section while it is null.

alter table public.subjects add column if not exists description text;
