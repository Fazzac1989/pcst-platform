/**
 * Purge the cached HTML for every published trip, plus the taxonomy pages.
 *
 *   node scripts/revalidate-all.mjs
 *
 * Trip pages are statically generated, so a change made straight in the
 * database does not reach the site until the page is revalidated — which is
 * why several trips showed no day photographs even though the images were
 * set. This walks the whole list rather than guessing which ones moved.
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const db = createClient(
  process.env.PCST_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.PCST_SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

const SITE = process.env.PCST_SITE_URL ?? 'https://pcst-platform.vercel.app';
const SECRET = process.env.PCST_REVALIDATE_SECRET ?? process.env.REVALIDATE_SECRET;
if (!SECRET) throw new Error('no revalidate secret in the environment');

const { data: trips } = await db.from('trips').select('slug').eq('status', 'published').order('slug');
const slugs = (trips ?? []).map((t) => t.slug);
console.log(`revalidating ${slugs.length} published trips + taxonomy`);

let ok = 0;
const failed = [];
for (const slug of slugs) {
  const url = `${SITE}/api/revalidate?secret=${encodeURIComponent(SECRET)}&slug=${encodeURIComponent(slug)}&scope=taxonomy`;
  try {
    const res = await fetch(url, { method: 'POST' });
    if (res.ok) ok++;
    else failed.push(`${slug}: ${res.status}`);
  } catch (e) {
    failed.push(`${slug}: ${e.message}`);
  }
}

console.log(`${ok} revalidated`);
if (failed.length) {
  console.log('failed:');
  for (const f of failed) console.log(`  ${f}`);
}
