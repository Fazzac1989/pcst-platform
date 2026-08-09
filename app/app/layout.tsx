import type { Metadata, Viewport } from 'next';
import Splash from './Splash';

export const metadata: Metadata = {
  title: { default: 'PCT Trips', template: '%s — PCT Trips' },
  description: 'Your school trip, in your pocket — Premium Choice School Trips.',
  manifest: '/app-manifest.webmanifest',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'PCT Trips' },
};

export const viewport: Viewport = {
  themeColor: '#16242E',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function AppShellLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="papp">
      <Splash />
      {children}
    </div>
  );
}
