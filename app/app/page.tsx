import Image from 'next/image';
import { redirect } from 'next/navigation';
import { getAppSession } from '@/lib/app/session';
import LoginForm from './LoginForm';

export default async function AppLoginPage() {
  const session = await getAppSession();
  if (session) redirect('/app/trip');

  return (
    <div className="papp-login">
      <Image
        src="/images/logo-white.png"
        alt="Premium Choice School Trips"
        width={524}
        height={130}
        style={{ height: 72, width: 'auto', margin: '0 auto' }}
        priority
      />
      <h1>
        Your trip, <i>in your pocket</i>
      </h1>
      <p>Enter the personal access code from your trip pack.</p>
      <LoginForm />
      <div className="papp-hint">
        Teachers, students and parents each have their own code.
        <br />
        Lost yours? Ask your trip organiser or call +971 4 420 6965.
      </div>
    </div>
  );
}
