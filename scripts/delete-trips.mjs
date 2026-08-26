/**
 * Delete trips, after writing everything about them to a backup file.
 *
 *   node scripts/delete-trips.mjs slug-a slug-b            → dry run
 *   node scripts/delete-trips.mjs slug-a slug-b --apply
 *
 * Deletion is irreversible, so the backup is written first and the run stops
 * if it cannot be written. Child rows go before the trip itself; anything the
 * database refuses to let go of is reported rather than forced.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const db = createClient(
  process.env.PCST_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.PCST_SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

const APPLY = process.argv.includes('--apply');
const slugs = process.argv.slice(2).filter((a) => !a.startsWith('--'));
if (!slugs.length) throw new Error('name at least one trip slug');

/** Tables that hang off a trip, cleared before the trip row itself. */
const CHILDREN = ['itinerary_days', 'trip_highlights', 'trip_views', 'enquiries'];

const backup = { takenAt: new Date().toISOString(), trips: [] };

for (const slug of slugs) {
  const { data: trip } = await db.from('trips').select('*').eq('slug', slug).maybeSingle();
  if (!trip) {
    console.log(`${slug}: not found`);
    continue;
  }
  const record = { trip, children: {} };
  for (const table of CHILDREN) {
    const { data, error } = await db.from(table).select('*').eq('trip_id', trip.id);
    if (error) continue; // table may not exist or may not key on trip_id
    record.children[table] = data ?? [];
  }
  backup.trips.push(record);
  const counts = Object.entries(record.children)
    .map(([t, r]) => `${t} ${r.length}`)
    .join(', ');
  console.log(`${slug}: "${trip.title}" [${trip.status}] — ${counts}`);
}

if (!backup.trips.length) {
  console.log('nothing to delete');
  process.exit(0);
}

mkdirSync('scripts/data', { recursive: true });
const path = `scripts/data/deleted-trips-backup.json`;
writeFileSync(path, JSON.stringify(backup, null, 1));
console.log(`\nbackup written to ${path}`);

if (!APPLY) {
  console.log('\nDry run. Re-run with --apply to delete.');
  process.exit(0);
}

const problems = [];
for (const { trip, children } of backup.trips) {
  for (const [table, rows] of Object.entries(children)) {
    if (!rows.length) continue;
    const { error } = await db.from(table).delete().eq('trip_id', trip.id);
    if (error) problems.push(`${trip.slug}/${table}: ${error.message}`);
    else console.log(`  deleted ${rows.length} from ${table}`);
  }
  const { error } = await db.from('trips').delete().eq('id', trip.id);
  if (error) problems.push(`${trip.slug}: ${error.message}`);
  else console.log(`  deleted trip ${trip.slug}`);
}

console.log(problems.length ? `\nproblems:\n  ${problems.join('\n  ')}` : '\ndone');
