import type { Metadata } from 'next';
import InfoPage from '@/components/InfoPage';

export const metadata: Metadata = {
  alternates: { canonical: '/about' },
  title: 'Our story',
  description:
    'Premium Choice School Trips is part of a family-owned Dubai travel company: four decades in travel, a household that knows school life from the inside, and journeys built around parents, children and teachers.',
};

export default function AboutPage() {
  return (
    <InfoPage
      eyebrow="Our story"
      title="Travel has always been a family affair"
      heroLine="Family-owned, Dubai-based, and built on four decades in travel"
      lede="Premium Choice School Trips is part of Premium Choice Travel, a family-owned travel company built on something increasingly rare in our industry: real experience, personal relationships and genuine care for the people who travel with us. In our case, that means the students in your care, the teachers who lead them and the parents who wave them off."
      sections={[
        {
          title: 'Four decades in travel',
          intro:
            'At the heart of the business is Paul Farrell, whose career in travel stretches back four decades. Long before online booking engines and endless comparison websites became the norm, Paul was building trips through knowledge, relationships and personal service. That is still how a school trip is put together here — by people who know the destination, know the suppliers, and answer the phone.',
        },
        {
          title: 'A family that knows school life from the inside',
          intro:
            'Paul’s wife began her career in the travel industry before spending the last 24 years within a well known school in Dubai. The shape of a school year is familiar to us at home rather than on paper: term dates and half-terms, exam windows, parents’ evenings, and the pressure on the teacher who volunteered to organise the trip. Their son has followed the same path, building his own career in travel and tourism in the UAE, so the family connection with the industry now spans generations.',
        },
        {
          title: 'Dubai home. A world of experience.',
          intro:
            'We understand expat school life because we have lived it ourselves. UAE term dates do not line up with the UK calendar. A single year group can hold a dozen different passports, with the visa and documentation work that follows. Flights leave at awkward hours, and the summer heat rules out some destinations entirely. That local understanding shapes every itinerary we propose.',
        },
        {
          title: 'Why we are called Premium Choice',
          intro:
            'For us, “Premium” does not mean the most expensive hotel or the longest flight. It means a better choice — and on a school trip, the better choice is usually the practical one:',
          points: [
            'The right week in the school calendar.',
            'The right rooming and supervision arrangements.',
            'The right balance of curriculum, challenge and downtime.',
            'The right accommodation for a group rather than a couple.',
            'The right pace, so students arrive able to learn rather than exhausted.',
            'And people you can actually reach — including when you are abroad with thirty students.',
          ],
        },
        {
          title: 'Parents, children and teachers',
          intro:
            'Every school trip has three equally important groups behind it: the parents who trust you with their child, the students who will remember it for years, and the teachers who carry the responsibility. A trip only works when all three are looked after, and that is the test we apply to every itinerary we design.',
        },
        {
          title: 'From our family to yours',
          intro:
            'We want Premium Choice School Trips to feel like having someone in the travel industry you know and trust — someone you can email and say “we are thinking about Japan for the Art department next Easter, where would you start?” Someone who remembers that your school prefers full board, that you need a quiet room for a student who travels anxiously, or that last year’s coach transfer ran too long. Someone who is there before, during and after the trip. Because after a lifetime in travel, one thing has never changed: the best school trips are not booked. They are carefully chosen.',
        },
      ]}
      related={[
        { label: 'Why Premium Choice', href: '/why-premium-choice' },
        { label: 'Safety & Safeguarding', href: '/safety' },
        { label: 'All trips', href: '/trips' },
      ]}
    />
  );
}
