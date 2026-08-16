'use server';

import Anthropic from '@anthropic-ai/sdk';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { ActionResult } from './actions';

export type CountryFacts = {
  capital: string;
  currency: string;
  languages: string;
  timezone: string;
  population: string;
  best_time: string;
};

const FACTS_SCHEMA = {
  type: 'object',
  properties: {
    is_country: {
      type: 'boolean',
      description: 'False if the name is not a country (a city, a region, or two countries joined).',
    },
    capital: { type: 'string', description: 'Capital city. Empty string if not a country.' },
    currency: { type: 'string', description: 'e.g. "Euro (EUR)" or "Japanese yen (JPY)"' },
    languages: {
      type: 'string',
      description: 'Main language(s) a visitor will hear, comma separated, at most three.',
    },
    timezone: {
      type: 'string',
      description:
        'e.g. "CET (UTC+1)". For countries spanning several zones, summarise: "6 zones (UTC−5 to UTC−10)".',
    },
    population: { type: 'string', description: 'Approximate and rounded, e.g. "68 million".' },
    best_time: {
      type: 'string',
      description: 'Best months for a school trip, e.g. "April to June, September to October".',
    },
  },
  required: ['is_country', 'capital', 'currency', 'languages', 'timezone', 'population', 'best_time'],
  additionalProperties: false,
} as const;

const SYSTEM = `You provide accurate, at-a-glance country facts for a school-travel company's website, read by teachers planning a trip.

Give the widely accepted, present-day answer a well-informed travel consultant would give — the current capital, not a historical one; the language a visitor will actually hear, not a list of every regional official language. Keep every value short enough to sit in a narrow panel.

Figures must be approximate and rounded ("68 million", not "67,981,000") so they stay correct as time passes. If the name given is not a country — a city, a region, or two countries joined together — set is_country to false and leave the other fields as empty strings.`;

/** Average annual temperature from Open-Meteo's measured record for the capital. */
async function averageTemperature(capital: string, country: string): Promise<number | null> {
  try {
    const geo = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
        capital
      )}&count=1&language=en&format=json`,
      { next: { revalidate: 86400 } }
    );
    const place = (await geo.json())?.results?.[0];
    if (!place) return null;

    const archive = await fetch(
      `https://archive-api.open-meteo.com/v1/archive?latitude=${place.latitude}&longitude=${place.longitude}` +
        `&start_date=2025-01-01&end_date=2025-12-31&daily=temperature_2m_mean&timezone=UTC`,
      { next: { revalidate: 86400 } }
    );
    const daily = (await archive.json())?.daily?.temperature_2m_mean;
    const temps: number[] = (daily ?? []).filter((t: number | null) => typeof t === 'number');
    if (temps.length < 300) return null; // not a full year of record — don't publish a skewed figure
    return Math.round((temps.reduce((a, b) => a + b, 0) / temps.length) * 10) / 10;
  } catch {
    return null; // a missing temperature is not worth failing the whole fetch over
  }
}

/** Draft the facts for one country and save them. Values stay editable afterwards. */
export async function fetchCountryFacts(id: number): Promise<ActionResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { ok: false, error: 'The Claude API key is not configured on this environment.' };
  }

  const db = createClient();
  const { data: country, error: readErr } = await db
    .from('countries')
    .select('id, name')
    .eq('id', id)
    .maybeSingle();
  if (readErr || !country) return { ok: false, error: readErr?.message ?? 'Country not found.' };

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  let facts: CountryFacts & { is_country: boolean };
  try {
    const response = await client.messages.create({
      model: 'claude-opus-5',
      max_tokens: 2000,
      output_config: { effort: 'low', format: { type: 'json_schema', schema: FACTS_SCHEMA } },
      system: SYSTEM,
      messages: [{ role: 'user', content: `Country: ${country.name}` }],
    });
    if (response.stop_reason === 'refusal') return { ok: false, error: 'Claude declined this request.' };
    const block = response.content.find((b) => b.type === 'text');
    if (!block || block.type !== 'text') return { ok: false, error: 'Claude returned no content.' };
    facts = JSON.parse(block.text);
  } catch (e: any) {
    if (e instanceof Anthropic.AuthenticationError) {
      return { ok: false, error: 'The Claude API key was rejected — check ANTHROPIC_API_KEY.' };
    }
    return { ok: false, error: `Could not fetch facts: ${e.message}` };
  }

  if (!facts.is_country) {
    return {
      ok: false,
      error: `"${country.name}" is not a country, so there are no facts to show. Rename it or leave its panel empty.`,
    };
  }

  const avgTemp = await averageTemperature(facts.capital, country.name);

  const { error } = await db
    .from('countries')
    .update({
      capital: facts.capital,
      currency: facts.currency,
      languages: facts.languages,
      timezone: facts.timezone,
      population: facts.population,
      best_time: facts.best_time,
      avg_temp_c: avgTemp,
      facts_updated_at: new Date().toISOString(),
    })
    .eq('id', id);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/trips/[slug]', 'page');
  revalidatePath('/countries/[slug]', 'page');
  return { ok: true, id };
}

/** Save hand-edited facts. */
export async function saveCountryFacts(
  id: number,
  facts: CountryFacts & { avg_temp_c: number | null }
): Promise<ActionResult> {
  const db = createClient();
  const { error } = await db
    .from('countries')
    .update({
      capital: facts.capital.trim() || null,
      currency: facts.currency.trim() || null,
      languages: facts.languages.trim() || null,
      timezone: facts.timezone.trim() || null,
      population: facts.population.trim() || null,
      best_time: facts.best_time.trim() || null,
      avg_temp_c: facts.avg_temp_c,
      facts_updated_at: new Date().toISOString(),
    })
    .eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/trips/[slug]', 'page');
  revalidatePath('/countries/[slug]', 'page');
  return { ok: true };
}
