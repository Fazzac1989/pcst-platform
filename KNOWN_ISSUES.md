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

## Phase 4 — the studio

**Two terms sets exist, both flagged default.** The Finland seed ran twice in an
earlier phase and inserted an identical `brochure_terms_sets` row. Ids 1 and 2
have byte-identical content and both carry `is_default = true`, so anything
looking up "the default" gets an arbitrary one. Id 1 is unreferenced; id 2 is
the one proposal 13 uses. The seed is now idempotent so it cannot recur, but the
existing duplicate has not been deleted — that is a destructive database write
and is left for a human to run:

    delete from brochure_terms_sets where id = 1;

**The image picker loads the whole library.** `brochure_images` is a shared
library with no per-proposal scope, so the day editor lists every image (29
today). That is fine now and will not be at several hundred; it needs a filter,
by tag or by a search box, before the library grows.

**The admin UI has not been clicked through.** The studio is behind an admin
session, which is the operator's to hold, so the pages were verified by build,
type-check and by running their queries directly against the database rather
than by driving the interface.

**The overview headline is still composed, not authored.** Flagged in phase 2:
the reference's trip-specific overview sentence has no field, so the renderer
builds a weaker one. It belongs in the Document tab and is not there yet.

## Phase 5 — workflow and email

**The "proposal opened" notification will not send.** This app has no
`RESEND_API_KEY`, and neither `PROPOSAL_NOTIFY_EMAIL` nor the
`APPOINTMENT_NOTIFY_EMAIL` it falls back to is set. The code no-ops quietly by
design, so nothing breaks — but nobody is told when a school opens a proposal
until those three are configured on this deployment. The Premium Choice Travel
app, which sends the proposal to the school, is configured and does send.

**The proposal email is sent from the wrong name.** `RESEND_FROM` in the
Premium Choice Travel app is "Premium Choice Travel
<enquiries@premiumchoicetravel.com>", so a School Trips proposal arrives from
Premium Choice Travel while being branded School Trips inside. Fixing it means
a verified sender for the School Trips domain in Resend, which is a DNS
decision rather than a code change.

**View counting is user-agent based.** Link previewers, crawlers, scripted
fetches and our own PDF renderer are excluded by their user agent, which is a
string anyone can set. It is right for the case it exists to handle — a
proposal emailed to a school gets opened by Outlook and WhatsApp before any
teacher sees it — but it is a heuristic, not a guarantee, and a previewer with
a browser-shaped user agent would still be counted.

**Every open is recorded as an event.** That keeps the count honest under
concurrent opens, but a proposal read fifty times has fifty rows. The admin
timeline summarises them into one line; anything else reading the table should
expect the volume.

## Phase 6 — document import

**Imported proposals have no photographs.** The importer builds days, timetables
and flights, but images are a shared library keyed by id and a document has no
way to refer to them. Every imported day starts with none, and the hero is
unset, so the opening page is a flat colour until someone picks images in the
studio.

**Booking conditions are not imported.** Documents carry them — the Japan
reference has a deposit, a cancellation scale and a passport deadline — but
terms are versioned sets shared across proposals, not per-proposal text, and
guessing which set a document's wording corresponds to would be worse than
leaving it. The extraction says so in its notes; a terms set has to be chosen
in the studio.

**Extraction quality depends on the document.** Run against the Japan reference
it found nine days and ten inclusions, and correctly refused to invent the
price, the dates, the flights and the hotel names that document does not state.
A messier document will do worse. Everything lands as a draft, which cannot be
opened through a share link, and the gaps are listed before the editor opens.

## The flipbook, retired

**Brochures render as a collection report.** `/brochures/<slug>` serves cover,
contents, a spread per trip, then a closing page. Flipbook.tsx,
BrochurePageView.tsx and ReadingView.tsx are gone, along with `?view=read` —
there is no separate accessible view to keep in step because the document
itself is the accessible one. Password gating, unlisted visibility and the SEO
rules are unchanged; all six published brochures still serve.

**A brochure PDF is 12MB.** Chromium's PDF export re-encodes every image
losslessly rather than carrying the JPEG through, so the file size follows
pixel count almost exactly — thirty-two photographs came to 43MB from 4.8MB of
source images, and Storage refused it outright. Two measured changes brought it
down: images are requested at the size they are shown, and the gallery strips
are hidden in print, where the hero above them has already made the point. It
is still large. It is delivered as a link, not an attachment, which is the only
reason 12MB is workable.

**Report class names are prefixed rep-.** The site's own stylesheet already
owns .trip, .meta, .side, .journey and .closing. An unprefixed .trip inherited
a dark card background and a 4/3 aspect ratio from it, which is how the first
version rendered every trip spread as a navy box.

**Editorial pages with no content are skipped.** The block model keeps them as
placeholders; rendering them produced five identical sections containing the
word "About" and nothing else.

**Design tokens are duplicated between the two stylesheets.** A proposal and a
brochure are different documents and have separate CSS, but they go to the same
school in the same week. A test compares the two :root blocks and fails if they
drift.
