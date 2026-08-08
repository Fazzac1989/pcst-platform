import { NextResponse, type NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getAppSession } from '@/lib/app/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Live interpreter for app members. Speech-to-text and text-to-speech run
 * on-device in the browser; this route only translates text via Claude.
 */
export async function POST(request: NextRequest) {
  const session = await getAppSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: 'Signed out — log in again.' }, { status: 401 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { ok: false, error: 'Translation is not configured yet (ANTHROPIC_API_KEY missing).' },
      { status: 503 }
    );
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid request.' }, { status: 400 });
  }

  const text = String(body.text ?? '').trim().slice(0, 2000);
  const sourceLang = String(body.sourceLang ?? '').slice(0, 40);
  const targetLang = String(body.targetLang ?? '').slice(0, 40);
  if (!text || !sourceLang || !targetLang) {
    return NextResponse.json({ ok: false, error: 'Missing text or languages.' }, { status: 400 });
  }

  try {
    const client = new Anthropic();
    const response = await client.beta.messages.create({
      model: 'claude-opus-5',
      max_tokens: 2048,
      output_config: { effort: 'low' },
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system:
        'You are a live interpreter helping a school group abroad talk with locals. ' +
        `Translate the user's message from ${sourceLang} to ${targetLang}. ` +
        'Return ONLY the translation — no commentary, no quotation marks, no notes. ' +
        'Keep the tone and register of the original (casual stays casual, polite stays polite). ' +
        'If the message is unintelligible or empty, return your best guess at what was meant.',
      messages: [{ role: 'user', content: text }],
    });

    if (response.stop_reason === 'refusal') {
      return NextResponse.json(
        { ok: false, error: 'That phrase could not be translated — try rephrasing.' },
        { status: 422 }
      );
    }

    const translation = response.content
      .filter((b) => b.type === 'text')
      .map((b: any) => b.text)
      .join('')
      .trim();
    if (!translation) {
      return NextResponse.json({ ok: false, error: 'No translation produced — try again.' }, { status: 502 });
    }
    return NextResponse.json({ ok: true, translation });
  } catch (e: any) {
    if (e instanceof Anthropic.AuthenticationError) {
      return NextResponse.json(
        { ok: false, error: 'Translation is not configured correctly (invalid API key).' },
        { status: 503 }
      );
    }
    if (e instanceof Anthropic.RateLimitError) {
      return NextResponse.json(
        { ok: false, error: 'Too many translations at once — wait a moment and retry.' },
        { status: 429 }
      );
    }
    console.error('[translate]', e?.message ?? e);
    return NextResponse.json({ ok: false, error: 'Translation failed — try again.' }, { status: 502 });
  }
}
