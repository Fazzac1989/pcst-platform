/**
 * Run the real extraction prompt against real itinerary days and check the
 * output against the source, without writing anything.
 *
 *   node scripts/verify-extraction.mjs japan-design-and-technology
 *
 * The check that matters: every highlight name must be traceable to the source
 * text, and every hedge in the source must survive into the structured output.
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { extractDay } from '../lib/itinerary/extract.ts';

dotenv.config({ path: '.env.local' });

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const slug = process.argv[2] ?? 'japan-design-and-technology';
const only = process.argv[3] ? Number(process.argv[3]) : null;

const { data: trip } = await db
  .from('trips')
  .select('id, title, subjects(name), countries(name), itinerary_days(id, sort_order, label, title, description)')
  .eq('slug', slug)
  .maybeSingle();
if (!trip) throw new Error(`no trip ${slug}`);

const days = trip.itinerary_days.sort((a, b) => a.sort_order - b.sort_order);
const HEDGES = /(subject to|weather permitting|depending on|if time|where possible|may (also )?(be|see|visit)|availability|where available|local conditions)/i;

let problems = 0;
for (const d of days) {
  if (only && d.sort_order !== only) continue;
  const s = await extractDay({
    dayNumber: d.sort_order, totalDays: days.length, label: d.label,
    title: d.title, description: d.description,
    tripTitle: trip.title, subject: trip.subjects?.name ?? null, country: trip.countries?.name ?? null,
  });

  console.log(`\n${'='.repeat(72)}`);
  console.log(`DAY ${d.sort_order} — ${s.displayTitle}   [${s.primaryLocation}]`);
  console.log(`  ${s.summary}`);
  console.log(`  words: ${d.description.split(/\s+/).length} source -> ${s.summary.split(/\s+/).length} summary`);
  console.log('  highlights:');
  for (const h of s.highlights) {
    console.log(`    ${h.type.padEnd(12)} ${h.name}${h.conditional ? `  [${h.conditionalText}]` : ''}`);
    console.log(`    ${''.padEnd(12)} ${h.summary}`);
  }
  if (s.transport.length) console.log(`  transport: ${s.transport.map((t) => `${t.mode} ${t.from}->${t.to}${t.highlight ? ' *' : ''}`).join(', ')}`);
  if (s.meals.length) console.log(`  meals: ${s.meals.join(' · ')}`);
  if (s.learningFocus.length) console.log(`  learning: ${s.learningFocus.join(' · ')}`);
  if (s.notices.length) console.log(`  notices: ${s.notices.join(' | ')}`);
  if (s.reviewFlags.length) console.log(`  flags: ${s.reviewFlags.map((f) => `${f.kind}: ${f.note}`).join(' | ')}`);

  // --- fabrication check: is each highlight name grounded in the source? ---
  const src = d.description.toLowerCase();
  for (const h of s.highlights) {
    const words = h.name.toLowerCase().split(/[^a-zà-ÿ]+/).filter((w) => w.length > 3);
    const grounded = words.length === 0 || words.some((w) => src.includes(w));
    if (!grounded) {
      problems++;
      console.log(`  !! POSSIBLE FABRICATION: "${h.name}" — no word of it appears in the source`);
    }
  }
  // --- hedge check: did any caveat in the source survive? ---
  if (HEDGES.test(d.description)) {
    const kept = s.highlights.some((h) => h.conditional) || s.notices.length > 0;
    if (!kept) {
      problems++;
      console.log('  !! HEDGE LOST: source contains conditional language but nothing was marked conditional');
    }
  }
}

console.log(`\n${'='.repeat(72)}`);
console.log(problems === 0 ? 'No fabrication or lost hedges detected.' : `${problems} PROBLEM(S) — review before shipping.`);
