import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Lands an invite or password-reset link: exchanges the one-time token for a
 * session cookie, then sends the teacher to set a password.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type');

  if (!tokenHash || (type !== 'invite' && type !== 'recovery')) {
    return NextResponse.redirect(`${origin}/portal/login?error=invalid`);
  }

  const supabase = createClient();
  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
  if (error) {
    return NextResponse.redirect(`${origin}/portal/login?error=expired`);
  }

  return NextResponse.redirect(`${origin}/portal/set-password`);
}
