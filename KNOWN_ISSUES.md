# Known issues — Brochure Studio

Things carried forward deliberately, and where the build departs from the
reference file (`reference/finland-proposal.html`). Each entry says why, so a
later reader can tell a decision from an oversight.

## Deviations from the reference

**Body typeface is Archivo, not Manrope.**
The reference sets Fraunces for display and Manrope for body. The School Trips
site uses Fraunces and Archivo everywhere else, and matching the reference
would leave proposals looking unlike the site that sends them. Instructed to
keep Archivo. Display face, colours, spacing and layout are unchanged.

**Fonts stay on `next/font/google` rather than moving to `/public/fonts`.**
The brief asks for self-hosted woff2 so proposals render offline and in
headless Chromium. `next/font/google` already does exactly that: the files are
downloaded at build time and served as woff2 from our own origin — verified on
the live site, which makes no request to Google at runtime. Moving them by hand
would add work and lose next/font's generated `size-adjust` fallback metrics,
which the same brief relies on for zero layout shift.

## Reference data kept as written

**Day 4 dinner and sauna times overlap.**
The reference timetable has the evening meal and the sauna running across the
same period. Kept verbatim rather than tidied — it may be how the day genuinely
runs, and inventing a correction would be worse than showing what was written.
Flagged for Premium Choice to confirm.

**Flight times are labels, not timestamps.**
The reference prints "00:35", "Check-in 21:30, 17 January" and "1 h 45" as
written text, without dates or timezones on every leg. `brochure_flights` has
`departs_at` / `arrives_at` timestamp columns for when a real schedule is
attached, but the seeded Finland flights carry their times in `note` and render
verbatim. Deriving timestamps would mean inventing dates and a timezone the
reference does not state.

**Prices are indicative and say so.**
"AED 11,190" is described in the reference as an indicative per-student price
based on 20 paying students, confirmed on booking. The renderer must keep that
qualifier attached to the number wherever it appears.

## Open questions

**The `schools` table is empty and exposes no columns.**
`brochures.school_id` is therefore a plain `bigint` with no foreign key, and
school-user RLS is unproven. Both need revisiting once a school record exists —
until then a proposal is reachable by share token and by staff only.

**The admin and the public site are in different repositories.**
The Brochure Studio UI lives in the Premium Choice Travel app
(`/admin/school-trips/brochures`); the proposal the school sees is rendered
here. `lib/brochure/proposal-schema.ts` is mirrored across both and the two
copies must be changed together.

**The reference file is not in version control.**
`reference/` is gitignored in this repo — it holds large local-only design
files — so `reference/finland-proposal.html` must be placed by hand before the
seed will run. The seed says so plainly rather than failing on a missing file.

## Phase 3 — the PDF

**Two PDF engines now live in this repo.** Quotes and trip pages use
`@react-pdf/renderer`, which builds a document tree. Proposals use headless
Chromium, because the proposal PDF has to *be* the print stylesheet rather than
a second document that drifts from it. Neither is wrong; they answer different
questions. Worth revisiting only if a third case appears.

**Function size on Vercel is untested.** `@sparticuz/chromium` is roughly 50 MB
and Vercel's compressed limit for a serverless function is 50 MB. The route sets
`maxDuration = 60`, which needs a paid plan; on Hobby it is capped at 10 s and a
cold render measured ~11.5 s locally, so it would time out. Both need proving on
a real deploy — nothing here has run on Vercel yet.

**Day photos are `loading="lazy"`.** A headless render never scrolls, so the
route forces every image eager before printing. If the renderer is ever changed,
that step has to survive: without it 18 of 26 images were absent from the PDF.

**`page.pdf()` does not fire `beforeprint`.** The accordion handler in
`Chrome.tsx` therefore never runs during PDF generation, and the route opens
every `<details>` itself. Without it all 15 collapsible sections — every
timetable and the whole booking-conditions block — printed as bare headings.

**Rate limiting is per proposal, not per caller.** Six render requests in ten
minutes fall back to the stored file. That protects the renderer, but a single
reader repeatedly refreshing also throttles everyone else holding the same link.
Fine at present volumes; revisit if proposals are shared widely.
