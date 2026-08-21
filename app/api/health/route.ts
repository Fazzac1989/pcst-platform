import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/** Presence-only health flags — never exposes any secret values. */
export async function GET() {
  return NextResponse.json({
    ok: true,
    shutterstock: Boolean(process.env.SHUTTERSTOCK_API_TOKEN),
    anthropic: Boolean(process.env.ANTHROPIC_API_KEY),
    version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? 'dev',
  });
}
