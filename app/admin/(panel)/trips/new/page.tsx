import { createClient } from '@/lib/supabase/server';
import TripEditor from '../TripEditor';

export const dynamic = 'force-dynamic';

export default async function NewTripPage() {
  const db = createClient();
  const [{ data: subjects }, { data: countries }] = await Promise.all([
    db.from('subjects').select('id, name').order('name'),
    db.from('countries').select('id, name').order('name'),
  ]);
  return <TripEditor trip={null} subjects={subjects ?? []} countries={countries ?? []} />;
}
