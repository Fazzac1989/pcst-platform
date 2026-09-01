-- Editorial copy for a proposal.
--
-- Days, flights and terms have their own tables because they are lists that
-- get reordered. The rest of a proposal's writing — the hero headline, the
-- overview, the P·C·T columns, learning outcomes, signature experiences,
-- inclusions, next steps, contact — is one document that is always read and
-- written together, so it lives as a single jsonb field rather than eight more
-- tables.
--
-- Shape is lib/brochure/proposal-schema.ts → ProposalContent.
--
-- Run in the School Trips SQL editor. Safe to re-run.

alter table brochures add column if not exists content jsonb not null default '{}';
