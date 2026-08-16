import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

const NAV = [
  { href: '/admin/analytics', label: 'Analytics' },
  { href: '/admin/appointments', label: 'Appointments' },
  { href: '/admin/quotes', label: 'Quotes' },
  { href: '/admin/teachers', label: 'Teacher Portal' },
  { href: '/admin/planning', label: 'Trip Planning' },
  { href: '/admin/app', label: 'App Trips' },
  { href: '/admin/trips', label: 'Trips' },
  { href: '/admin/subjects', label: 'Subjects' },
  { href: '/admin/countries', label: 'Countries' },
  { href: '/admin/media', label: 'Media' },
  { href: '/admin/terms', label: 'Booking Terms' },
];

async function signOut() {
  'use server';
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect('/admin/login');
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/admin/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (profile?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-ink flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded p-10 text-center">
          <h1 className="font-serif text-2xl text-ink mb-2">Not authorised</h1>
          <p className="text-sm text-ink-soft mb-6">
            Your account ({user.email}) does not have admin access. Ask an administrator to set
            your profile role to <code>admin</code>.
          </p>
          <form action={signOut}>
            <button className="bg-teal text-ink font-semibold text-sm px-6 py-3 rounded-sm hover:bg-teal-hover transition-colors">
              Sign out
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-ink flex">
      <aside className="w-60 shrink-0 bg-ink text-white flex flex-col">
        <div className="p-5 border-b border-white/10">
          <Link href="/admin">
            <Image
              src="/images/logo-white.png"
              alt="Premium Choice School Trips"
              width={524}
              height={130}
              style={{ height: 48, width: 'auto' }}
            />
          </Link>
        </div>
        <nav className="flex-1 p-3 grid gap-1 content-start">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="px-3 py-2.5 rounded text-sm font-medium text-white/80 hover:text-teal hover:bg-white/5 transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-3 border-t border-white/10">
          <a
            href="/"
            target="_blank"
            className="block px-3 py-2 text-xs text-white/60 hover:text-teal"
          >
            View site ↗
          </a>
          <form action={signOut}>
            <button className="w-full text-left px-3 py-2 text-xs text-white/60 hover:text-teal">
              Sign out ({user.email})
            </button>
          </form>
        </div>
      </aside>
      <main className="flex-1 min-w-0 p-8 lg:p-10">{children}</main>
    </div>
  );
}
