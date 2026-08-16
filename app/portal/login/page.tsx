import { redirect } from 'next/navigation';
import { getPortalTeacher } from '@/lib/portal/session';
import LoginForm from './LoginForm';

export const dynamic = 'force-dynamic';

const MESSAGES: Record<string, string> = {
  invalid: 'That link was not valid. Ask us to send a new one.',
  expired: 'That link has expired or has already been used. Ask us to send a new one.',
};

export default async function PortalLoginPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  if (await getPortalTeacher()) redirect('/portal');
  const notice = searchParams.error ? MESSAGES[searchParams.error] ?? null : null;
  return <LoginForm notice={notice} />;
}
