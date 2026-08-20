/**
 * Write the short public description for each subject.
 *
 *   node scripts/write-subject-descriptions.mjs           # only subjects without one
 *   node scripts/write-subject-descriptions.mjs --force   # rewrite all
 *
 * Grounded in what the subject actually carries: the trips and destinations we
 * run for it, so the copy can name real places rather than write generically.
 */
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const force = process.argv.includes('--force');

const { data: subjects, error } = await db
  .from('subjects')
  .select('id, name, slug, description, trips(title, status, countries(name))');
if (error) {
  console.error(error.message.includes('description')
    ? 'Run the 20260821000000_subject_description.sql migration first.'
    : error.message);
  process.exit(1);
}

for (const s of subjects.sort((a, b) => a.name.localeCompare(b.name))) {
  const published = (s.trips ?? []).filter((t) => t.status === 'published');
  if (!published.length) { console.log(`--  ${s.name}: no published trips, skipped`); continue; }
  if (s.description?.trim() && !force) { console.log(`==  ${s.name}: already written`); continue; }

  const countries = [...new Set(published.map((t) => t.countries?.name).filter(Boolean))];

  try {
    const res = await claude.messages.create({
      model: 'claude-opus-5',
      max_tokens: 500,
      output_config: { effort: 'low' },
      system:
        'You write for a premium school-travel company in Dubai. Write a single paragraph of 55-80 words ' +
        'introducing a curriculum subject page: why taking students abroad brings this subject to life, ' +
        'touching on the kinds of places the company actually goes. British English. Warm, professional, ' +
        'no exclamation marks, no "vibrant", no bullet points, no heading — just the paragraph. Do not ' +
        'invent destinations beyond those given.',
      messages: [
        {
          role: 'user',
          content:
            `Subject: ${s.name}\n` +
            `Destinations we run for it: ${countries.join(', ')}\n` +
            `Trips: ${published.map((t) => t.title).join(' · ')}`,
        },
      ],
    });
    const block = res.content.find((b) => b.type === 'text');
    const text = block && block.type === 'text' ? block.text.trim() : '';
    if (!text) throw new Error('no text returned');

    const { error: upErr } = await db.from('subjects').update({ description: text }).eq('id', s.id);
    if (upErr) throw new Error(upErr.message);
    console.log(`OK  ${s.name}: ${text.slice(0, 90)}…`);
  } catch (e) {
    console.log(`!!  ${s.name}: ${e.message}`);
  }
}
