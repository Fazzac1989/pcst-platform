import { redirect } from 'next/navigation';

// The Team tab became Student Register + Support in the v2 layout.
export default function TeamPage() {
  redirect('/app/trip/register');
}
