import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

export const metadata: Metadata = {
  title: { default: 'Teacher portal', template: '%s — Teacher portal' },
  description: 'Your quotes, trips and paperwork with Premium Choice School Trips.',
  robots: { index: false, follow: false },
};

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="pt-shell">
      <header className="pt-head">
        <Link href="/portal" className="pt-logo">
          <Image src="/images/logo-navy.png" alt="Premium Choice School Trips" width={264} height={88} priority />
        </Link>
        <span className="pt-head-tag">Teacher portal</span>
      </header>
      <main className="pt-main">{children}</main>
      <footer className="pt-foot">
        Premium Choice School Trips · +971 4 420 6965 · info@premiumchoicetravel.com
      </footer>
    </div>
  );
}
