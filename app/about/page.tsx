import type { Metadata } from 'next';
import InfoPage from '@/components/InfoPage';

export const metadata: Metadata = {
  title: 'About us',
  description:
    'Premium Choice School Trips: educational travel led by Paul Farrell and powered by Premium Choice Travel, designed and supported from Dubai.',
};

export default function AboutPage() {
  return (
    <InfoPage
      eyebrow="About us"
      title="School travel, shaped by experience"
      heroLine="Powered by Premium Choice Travel, designed and supported from Dubai"
      lede="Led by Paul Farrell, a travel professional with more than 20 years of experience in the Middle East, Premium Choice School Trips combines extensive destination knowledge, trusted international partnerships and a highly personal approach to school travel. We work closely with our customers to understand their objectives and create a journey that is engaging, rewarding and appropriate for all students."
      sections={[
        {
          title: 'Part of Premium Choice Travel',
          intro:
            'School Trips is powered by Premium Choice Travel, an established Dubai travel company — bringing its buying power, partnerships and destination knowledge to educational travel.',
        },
        {
          title: 'Why we are called PCT',
          intro:
            'Every school trip has three equally important stakeholders: Parents, Children and Teachers. It is in our name, and every journey is designed for all three.',
        },
        {
          title: 'What we believe',
          intro:
            'Travel that educates. Journeys built with purpose rather than taken from a shelf, so students return with greater independence, broader perspectives and memories that remain with them long after they leave school.',
        },
        {
          title: 'Where we work',
          intro:
            'Programmes across more than 30 countries, covering the widest range of curriculum areas, educational themes and student interests — for schools across the UAE and beyond.',
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
