import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';

export const APP_COOKIE = 'pcst_app_code';

export type AppMember = {
  id: number;
  tripId: number;
  role: 'teacher' | 'student' | 'parent';
  name: string;
  loginCode: string;
  parentOf: number | null;
};

export type AppTrip = {
  id: number;
  title: string;
  destination: string;
  startDate: string | null;
  endDate: string | null;
  heroImage: string | null;
  itinerary: { label: string; title: string; description: string }[];
  contacts: { label: string; phone: string }[];
  confirmations: { label: string; ref: string }[];
  status: string;
};

/**
 * Resolve the signed-in app member from the access-code cookie.
 * Wrapped in React cache() so the layout and page share one lookup per request.
 */
export const getAppSession = cache(async function getAppSession(): Promise<{ member: AppMember; trip: AppTrip } | null> {
  const code = cookies().get(APP_COOKIE)?.value;
  if (!code || code.length < 8) return null;

  const db = createAdminClient();
  const { data } = await db
    .from('app_members')
    .select('id, app_trip_id, role, name, login_code, parent_of, app_trips(*)')
    .eq('login_code', code)
    .maybeSingle();
  if (!data || !data.app_trips) return null;
  const t: any = data.app_trips;
  if (t.status !== 'active') return null;

  return {
    member: {
      id: data.id,
      tripId: data.app_trip_id,
      role: data.role,
      name: data.name,
      loginCode: data.login_code,
      parentOf: data.parent_of,
    },
    trip: {
      id: t.id,
      title: t.title,
      destination: t.destination,
      startDate: t.start_date,
      endDate: t.end_date,
      heroImage: t.hero_image,
      itinerary: t.itinerary ?? [],
      contacts: t.contacts ?? [],
      confirmations: t.confirmations ?? [],
      status: t.status,
    },
  };
});
