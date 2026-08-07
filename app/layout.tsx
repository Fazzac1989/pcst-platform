import type { Metadata } from 'next';
import { Archivo, Fraunces } from 'next/font/google';
import './globals.css';

const archivo = Archivo({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-archivo',
  display: 'swap',
});

const fraunces = Fraunces({
  subsets: ['latin'],
  weight: 'variable',
  style: ['normal', 'italic'],
  axes: ['opsz'],
  variable: '--font-fraunces',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: {
    default: 'Premium Choice School Trips — Educational travel, designed around your curriculum',
    template: '%s — Premium Choice School Trips',
  },
  description:
    'Educational travel designed, priced and supported from Dubai — safe, inspiring, professionally managed school trips for schools across the UAE and beyond.',
  icons: { icon: '/images/favicon.png', apple: '/images/favicon.png' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${archivo.variable} ${fraunces.variable}`}>
      <body>{children}</body>
    </html>
  );
}
