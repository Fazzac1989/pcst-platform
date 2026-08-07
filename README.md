# Premium Choice School Trips — Platform

Production website + CMS for Premium Choice School Trips (Dubai): Next.js 14
(App Router, TypeScript) · Supabase (Postgres, Auth, Storage) · Tailwind
(brand tokens only) · deployed on Vercel.

The public site is a pixel-faithful port of the approved design in
`/reference`. Content (trips, itineraries, booking terms) is database-driven
and managed from `/admin`.

## Environment variables

| Variable | Where | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | client + server | Supabase project URL (Settings → API) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client + server | Supabase anon key — RLS enforced |
| `SUPABASE_SERVICE_ROLE_KEY` | **server only** | Used by `npm run seed` exclusively |
| `REVALIDATE_SECRET` | server | Authorizes `POST /api/revalidate` (external triggers) |
| `NEXT_PUBLIC_SITE_URL` | client + server | Canonical URL for sitemap / OpenGraph |

Copy `.env.example` to `.env.local` and fill the values.

> **No Supabase yet?** The public site falls back to rendering from
> `reference/trips-seed.json` when the Supabase env vars are absent, so you
> can preview it immediately. `/admin` requires Supabase.

## Local development

```bash
npm install
npm run dev
```

Cloud-first Supabase is the expected setup (a free project at
[database.new](https://database.new) is fine). Local `supabase start`
(Docker) also works if you prefer.

## Database: migrations + seed

1. Create a Supabase project and put its keys in `.env.local`.
2. Apply the migration — either:
   - **Dashboard**: SQL Editor → paste
     `supabase/migrations/20260807000000_init.sql` → Run, or
   - **CLI**: `npx supabase link --project-ref <ref>` then `npx supabase db push`.
3. Seed the 11 trips, subjects, countries and the 7 booking terms:

```bash
npm run seed
```

The seed is idempotent — safe to re-run any time. The six homepage-featured
trips (jordan, iceland, london, berlin, paris, athens) are marked
`featured=true`.

## Creating the first admin

1. Supabase Dashboard → Authentication → Users → **Add user** — create an
   email + password user (e.g. `admin@premiumchoicetravel.com`).
2. SQL Editor → run (replacing the email):

```sql
insert into public.profiles (id, role)
select id, 'admin' from auth.users where email = 'admin@premiumchoicetravel.com'
on conflict (id) do update set role = 'admin';
```

3. Sign in at `/admin/login`. Non-admin accounts are rejected by both RLS
   and the admin layout.

## Architecture notes

- **RLS is the security boundary.** Anon can only read published content;
  every admin mutation runs through cookie-authenticated server actions
  checked by the `is_admin()` Postgres function. The service-role key is
  used only by the seed script.
- **Static public pages.** `/`, `/trips` and every `/trips/[slug]` are
  statically generated (`generateStaticParams`). Admin actions call
  `revalidatePath` on publish/save, so content changes go live without a
  rebuild. `POST /api/revalidate?secret=…&slug=…` exists for external
  triggers.
- **Storage**: public bucket `trip-images` (admin-only writes) for hero and
  gallery photography. Uploads happen in the browser with the user's
  session; public read via CDN URL.
- **Phase 2 ready**: `schools`, `enquiries`, `quotes`, `quote_lines` and
  `profiles.role='school'` are already in the schema (admin-locked) so the
  school portal can be added without rework.

## Deploying to Vercel

1. Push this repo to GitHub and import it in Vercel.
2. Set all env vars from the table above (Production + Preview). Set
   `NEXT_PUBLIC_SITE_URL` to the production domain.
3. Deploy. Then verify:
   - `/` shows the six featured trips (from the database),
   - `/trips/jordan` renders with terms accordion,
   - `/admin` redirects to `/admin/login`, and signing in with the admin
     user opens the panel,
   - editing + publishing a trip updates the public page within seconds.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` / `npm start` | Production build / serve |
| `npm run seed` | Idempotent database seed from `reference/trips-seed.json` |
| `npm run lint` | ESLint |
