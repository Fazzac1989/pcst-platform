import { redirect } from 'next/navigation';
import { getAppSession } from '@/lib/app/session';
import Translator from './Translator';

export const dynamic = 'force-dynamic';

export default async function TranslatePage() {
  const session = await getAppSession();
  if (!session) redirect('/app');
  return <Translator />;
}
