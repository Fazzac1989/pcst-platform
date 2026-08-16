import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import SetPasswordForm from './SetPasswordForm';

export const dynamic = 'force-dynamic';

export default async function SetPasswordPage() {
  // Reached with a session already established by the confirm route.
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/portal/login?error=expired');

  return <SetPasswordForm email={user.email ?? ''} />;
}
