import type { Metadata } from 'next';
import InfoPage from '@/components/InfoPage';

export const metadata: Metadata = {
  title: 'For teachers & trip leaders',
  description:
    'How Premium Choice School Trips supports teachers and trip leaders — from the first idea to the paperwork, the parents and the safe return.',
};

export default function ForTeachersPage() {
  return (
    <InfoPage
      eyebrow="For teachers & trip leaders"
      title="Run the trip, not the logistics"
      heroLine="Planning made straightforward, so you can concentrate on your students"
      lede="Leading a school trip is a professional responsibility carried on top of a full teaching load. Our aim is to make the planning process straightforward for teachers: we listen to what you want to achieve, design the programme around it, and handle the coordination — so your energy goes into the students, not the spreadsheets."
      sections={[
        {
          title: 'A programme built around your objectives',
          intro:
            'We engage directly with you to understand objectives, preferred destinations, budget, student needs and expectations — then design specifically for them.',
        },
        {
          title: 'Everything your leadership team will ask for',
          intro:
            'A carefully planned itinerary, transparent per-student pricing and the supporting information school leadership teams and parents need to say yes with confidence.',
        },
        {
          title: 'The paperwork, coordinated',
          intro: 'Once approved, we coordinate the moving parts and keep you documented throughout.',
          points: [
            'Travel arrangements, accommodation and activities',
            'Insurance and visa requirements',
            'Risk assessment documentation for your school',
            'Materials to help you prepare students and brief parents',
          ],
        },
        {
          title: 'Your command centre while travelling',
          intro:
            'The app puts the student register, headcounts, documents, emergency contacts, flights, rooms, vouchers, broadcast messaging and translation in your pocket — with 24-hour assistance behind it.',
        },
      ]}
      related={[
        { label: 'Why Premium Choice', href: '/why-premium-choice' },
        { label: 'Our app', href: '/app' },
        { label: 'Safety & Safeguarding', href: '/safety' },
      ]}
    />
  );
}
