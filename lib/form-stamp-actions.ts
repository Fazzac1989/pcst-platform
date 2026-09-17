'use server';

import { signStamp, stampSecret } from '@/lib/spam-guard';

/**
 * Hand a form a signed record of when it was opened.
 *
 * Called from the browser as the form mounts. A bot that posts straight to a
 * server action never asks for one, and a bot that fills the form the instant
 * it appears asks too recently. See lib/spam-guard.ts.
 */
export async function issueFormStamp(): Promise<string> {
  const secret = stampSecret();
  // Without a secret the guard does not check stamps either.
  if (!secret) return '';
  return signStamp(Date.now(), secret);
}
