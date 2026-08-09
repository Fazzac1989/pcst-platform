import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { appLogout } from '@/lib/app/actions';
import { getAppSession } from '@/lib/app/session';
import TabBar from './TabBar';

export default async function TripLayout({ children }: { children: React.ReactNode }) {
  const session = await getAppSession();
  if (!session) redirect('/app');

  return (
    <div className="papp-shell">
      <header className="papp-head">
        <Link href="/app/trip" className="papp-head-logo">
          <Image src="/images/logo-navy.png" alt="Premium Choice School Trips" width={132} height={44} priority />
        </Link>
        <form action={appLogout}>
          <button className="papp-logout" title="Sign out">
            ⎋
          </button>
        </form>
      </header>
      <main className="papp-main">{children}</main>
      <TabBar />
    </div>
  );
}
