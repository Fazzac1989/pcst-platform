import type { Metadata } from 'next';
import InfoPage from '@/components/InfoPage';

export const metadata: Metadata = {
  alternates: { canonical: '/our-app' },
  title: 'Your travel companion',
  description:
    'Your travel companion: the Premium Choice School Trips app gives teachers, parents and students each their own view of the same journey.',
};

// Note: /app belongs to the travelling app itself (code-based sign-in for
// groups on trips). This page is the public story about it.
export default function OurAppPage() {
  return (
    <InfoPage
      eyebrow="Our app"
      title="Your travel companion"
      heroLine="One trip, everyone connected — teacher, parent and student"
      lede="Every journey we run travels with its own app. Teachers get the controls, parents get the reassurance, students get the experience — all connected to the same live trip, before departure, on the ground and after the group is home."
      sections={[
        {
          title: 'Parent — follow the journey',
          intro: 'Home always knows all is well.',
          points: [
            'Live status and daily updates',
            'Photos from the journey',
            'Itinerary and flight information',
            'Notifications and emergency information',
          ],
        },
        {
          title: 'Child — experience the journey',
          intro: 'The trip in their hands, with the learning built in.',
          points: [
            "What's happening today and maps",
            'Learning challenges and assignments',
            'Destination content',
            'Trip journal and photos',
          ],
        },
        {
          title: 'Teacher — run the trip',
          intro: 'The command centre, in your pocket.',
          points: [
            'Student register and headcount',
            'Documents and emergency contacts',
            'Flights, rooms and vouchers',
            'Broadcast messaging and translation',
          ],
        },
        {
          title: 'Before, during and after',
          intro:
            'The app is part of every journey we run — from pre-departure preparation, through every day on the ground, to the photos and journal the group brings home. Travelling groups sign in with the personal access code from their trip pack.',
        },
      ]}
      related={[
        { label: 'For teachers', href: '/for-teachers' },
        { label: 'For parents', href: '/for-parents' },
        { label: 'Why Premium Choice', href: '/why-premium-choice' },
      ]}
    />
  );
}
