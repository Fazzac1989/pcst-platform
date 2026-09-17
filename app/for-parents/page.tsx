import type { Metadata } from 'next';
import InfoPage from '@/components/InfoPage';

export const metadata: Metadata = {
  alternates: { canonical: '/for-parents' },
  title: 'For parents',
  description:
    'What parents can expect when their child travels with Premium Choice School Trips — safety, communication and reassurance from departure to safe return.',
};

export default function ForParentsPage() {
  return (
    <InfoPage
      eyebrow="For parents"
      title="Home always knows all is well"
      heroLine="Confidence, communication, safety and reassurance — on every journey"
      lede="Handing your child's passport to someone else takes trust. We plan every journey so that trust is earned: carefully chosen accommodation and partners, insurance with clear documentation, information before departure, and communication throughout — so home is never left wondering."
      sections={[
        {
          title: 'Before they travel',
          intro: 'You know what the journey involves before anyone packs a bag.',
          points: [
            'Full itinerary and essential travel information in advance',
            'Insurance details, emergency contacts and supporting documentation',
            'Parent information sessions and pre-departure briefings',
            'Medical, dietary and student-specific requirements collected and acted on',
          ],
        },
        {
          title: 'While they are away',
          intro:
            'The parent view of our app follows the journey: live status, daily updates, photos, the itinerary, flight information and notifications — including the one that says the group has landed.',
        },
        {
          title: 'If something needs attention',
          intro:
            '24-hour assistance on every journey, with our Dubai team and experienced local partners in destination, and clear emergency information always to hand.',
        },
        {
          title: 'Why it matters to us',
          intro:
            'Parents are the P in PCT. Every journey is designed for three audiences — parents reassured, children inspired, teachers supported — and reassurance is engineered in, not promised afterwards.',
        },
      ]}
      related={[
        { label: 'Safety & Safeguarding', href: '/safety' },
        { label: 'Our app', href: '/app' },
        { label: 'Why Premium Choice', href: '/why-premium-choice' },
      ]}
    />
  );
}
