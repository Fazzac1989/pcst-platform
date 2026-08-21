import type { Metadata } from 'next';
import InfoPage from '@/components/InfoPage';

export const metadata: Metadata = {
  title: 'For school leaders',
  description:
    'What school leadership teams can expect from Premium Choice School Trips — documentation, risk assessment, transparent pricing and accountability.',
};

export default function ForSchoolLeadersPage() {
  return (
    <InfoPage
      eyebrow="For school leaders"
      title="Approve with confidence"
      heroLine="Documentation, transparency and accountability, before you are asked to sign"
      lede="A school trip is approved on evidence, not enthusiasm. Every proposal we prepare is written for the people who carry the responsibility: a clear programme, transparent per-student pricing, the risk assessment for that journey, and a named team accountable from the first conversation until every student is home."
      sections={[
        {
          title: 'A proposal your governors can read',
          intro:
            'A carefully planned itinerary with transparent per-student pricing and the essential information leadership teams, teachers and parents need — nothing buried, nothing vague.',
        },
        {
          title: 'Risk assessment as standard',
          intro:
            'Every programme is risk assessed across transport, accommodation, activities and destination-specific considerations, with documentation prepared in the format your school needs.',
        },
        {
          title: 'Duty of care, shared and explicit',
          intro:
            'Responsibility is mapped between the school, teachers, parents, students, our team and destination partners — so nothing is assumed and nothing is missed.',
          points: [
            'Insurance with policy documentation and a plain explanation of cover',
            'Established local partners chosen for their record with school groups',
            '24-hour assistance on every journey',
            'A follow-up with your trip coordinators after the group returns',
          ],
        },
        {
          title: 'Experience you can check',
          intro:
            'Led by Paul Farrell, a travel professional with more than 20 years of experience in the Middle East — with a portfolio of programmes across more than 30 countries.',
        },
      ]}
      related={[
        { label: 'Safety & Safeguarding', href: '/safety' },
        { label: 'For teachers', href: '/for-teachers' },
        { label: 'Why Premium Choice', href: '/why-premium-choice' },
      ]}
    />
  );
}
