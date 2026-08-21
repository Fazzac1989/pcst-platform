import type { Metadata } from 'next';
import InfoPage from '@/components/InfoPage';

export const metadata: Metadata = {
  title: 'Why Premium Choice',
  description:
    'Tailored school journeys, led by experience: why schools across the UAE plan their educational travel with Premium Choice School Trips.',
};

export default function WhyPage() {
  return (
    <InfoPage
      eyebrow="Why Premium Choice"
      title="Designed around your school"
      heroLine="Tailored journeys, led by more than 20 years of experience in the Middle East"
      lede="We create purposeful school journeys that take learning beyond the classroom. We engage directly with teachers and trip leaders, listening carefully to what they want to achieve, and design a journey that is exactly right for their school and students — not simply selected from a standard itinerary. From the first conversation through to the group's safe return, every detail is carefully considered and professionally managed."
      sections={[
        {
          title: 'Tailored, never off the shelf',
          intro:
            'Every programme is built around your objectives, preferred destinations, budget and students — with transparent per-student pricing.',
        },
        {
          title: 'Curriculum at the centre',
          intro:
            'Every itinerary is built around a subject — tectonics in Iceland, democracy in Berlin, trade in Singapore — so the journey earns its place in the school year.',
        },
        {
          title: 'With you at every stage',
          intro: 'One team from the first conversation to their safe return.',
          points: [
            'Listen and understand — objectives, destinations, budget and student needs',
            'Design and propose — itinerary, per-student pricing and the information leadership teams need',
            'Plan and prepare — travel, accommodation, activities, insurance and documentation',
            'Travel and return — experienced local partners and 24-hour assistance, then a follow-up visit',
          ],
        },
        {
          title: 'Safety, built in',
          intro:
            'Risk assessment, trusted partners, insurance with clear documentation and 24-hour support on every journey — not a page on our website, the itinerary itself.',
        },
        {
          title: 'One trip, everyone connected',
          intro:
            'Our app gives teachers, parents and students each their own view of the same journey — before, during and after travel.',
        },
        {
          title: 'Three perspectives, equally important',
          intro:
            'Parents reassured. Children inspired. Teachers supported. It is why we are called PCT — and every journey is designed for all three.',
        },
      ]}
      related={[
        { label: 'For teachers', href: '/for-teachers' },
        { label: 'For parents', href: '/for-parents' },
        { label: 'For school leaders', href: '/for-school-leaders' },
        { label: 'Our app', href: '/app' },
        { label: 'Safety & Safeguarding', href: '/safety' },
      ]}
    />
  );
}
