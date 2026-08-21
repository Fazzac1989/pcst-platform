/**
 * A line icon for each curriculum subject, matched on the subject's name.
 *
 * Hand-drawn strokes in the site's own visual language rather than a library,
 * so the set stays consistent and adds nothing to the bundle. Unknown subjects
 * get the compass — a new subject is never iconless.
 */

type IconName =
  | 'palette'
  | 'chart'
  | 'cog'
  | 'book'
  | 'film'
  | 'globe'
  | 'landmark'
  | 'chat'
  | 'triangle'
  | 'note'
  | 'mountain'
  | 'star'
  | 'flame'
  | 'flask'
  | 'snowflake'
  | 'trophy'
  | 'heart'
  | 'atom'
  | 'compass';

function iconFor(subject: string): IconName {
  const s = subject.toLowerCase();
  if (s.includes('art')) return 'palette';
  if (s.includes('business') || s.includes('econom')) return 'chart';
  if (s.includes('steam')) return 'atom';
  if (s.includes('design') || s.includes('technolog')) return 'cog';
  if (s.includes('english') || s.includes('literature')) return 'book';
  if (s.includes('film') || s.includes('media')) return 'film';
  if (s.includes('geograph')) return 'globe';
  if (s.includes('history')) return 'landmark';
  if (s.includes('language')) return 'chat';
  if (s.includes('math')) return 'triangle';
  if (s.includes('music')) return 'note';
  if (s.includes('outdoor')) return 'mountain';
  if (s.includes('performing') || s.includes('drama')) return 'star';
  if (s.includes('politic')) return 'landmark';
  if (s.includes('religio')) return 'flame';
  if (s.includes('science')) return 'flask';
  if (s.includes('ski')) return 'snowflake';
  if (s.includes('sport') || s.includes('physical')) return 'trophy';
  if (s.includes('volunteer') || s.includes('service')) return 'heart';
  return 'compass';
}

const PATHS: Record<IconName, React.ReactNode> = {
  palette: (
    <>
      <path d="M12 21a9 9 0 1 1 9-9c0 2.5-1.5 3.5-3 3.5h-2a2 2 0 0 0-1.5 3.3c.6.7.3 2.2-2.5 2.2Z" />
      <circle cx="7.5" cy="11" r="0.6" fill="currentColor" />
      <circle cx="10.5" cy="7.5" r="0.6" fill="currentColor" />
      <circle cx="15" cy="7.5" r="0.6" fill="currentColor" />
    </>
  ),
  chart: (
    <>
      <path d="M4 20V4" />
      <path d="M4 20h16" />
      <path d="M8.5 16v-5" />
      <path d="M13 16V8" />
      <path d="M17.5 16v-8.5" />
    </>
  ),
  cog: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" />
    </>
  ),
  book: (
    <>
      <path d="M12 6c-1.8-1.6-4.5-2-8-2v14c3.5 0 6.2.4 8 2 1.8-1.6 4.5-2 8-2V4c-3.5 0-6.2.4-8 2Z" />
      <path d="M12 6v14" />
    </>
  ),
  film: (
    <>
      <rect x="4" y="5" width="16" height="14" rx="1.5" />
      <path d="M8 5v14M16 5v14M4 9.5h4M4 14.5h4M16 9.5h4M16 14.5h4" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17M12 3.5c2.6 2.3 3.9 5.2 3.9 8.5s-1.3 6.2-3.9 8.5c-2.6-2.3-3.9-5.2-3.9-8.5s1.3-6.2 3.9-8.5Z" />
    </>
  ),
  landmark: (
    <>
      <path d="M4 20h16M5 17h14M12 4 4.5 8.5h15L12 4Z" />
      <path d="M7 11v6M12 11v6M17 11v6" />
    </>
  ),
  chat: (
    <>
      <path d="M4 5.5h11v8H8l-4 3.5v-11.5Z" />
      <path d="M15 9.5h5V17l-3-2h-5" />
    </>
  ),
  triangle: (
    <>
      <path d="M12 4 3.5 19h17L12 4Z" />
      <path d="M8.5 15h7" />
    </>
  ),
  note: (
    <>
      <path d="M9 18.5V6l10-2v12" />
      <circle cx="6.5" cy="18.5" r="2.5" />
      <circle cx="16.5" cy="16" r="2.5" />
    </>
  ),
  mountain: (
    <>
      <path d="m3 19 6-11 4 7" />
      <path d="m10.5 12.5 4-6.5L21 19H3" />
    </>
  ),
  star: (
    <path d="m12 4 2.3 4.9 5.2.7-3.8 3.7.9 5.3-4.6-2.6-4.6 2.6.9-5.3L4.5 9.6l5.2-.7L12 4Z" />
  ),
  flame: (
    <path d="M12 21c-3.6 0-6-2.4-6-5.6 0-2.8 2-4.7 3.4-6.7C10.6 7 11.5 5 11.5 3c2.9 1.7 6.5 5.9 6.5 12.4 0 3.2-2.4 5.6-6 5.6Zm0 0c-1.7 0-3-1.2-3-3 0-1.6 1.4-2.9 3-4.6 1.6 1.7 3 3 3 4.6 0 1.8-1.3 3-3 3Z" />
  ),
  flask: (
    <>
      <path d="M10 4v5.5L5 18a2 2 0 0 0 1.8 3h10.4A2 2 0 0 0 19 18l-5-8.5V4" />
      <path d="M8.5 4h7M7.5 15h9" />
    </>
  ),
  snowflake: (
    <>
      <path d="M12 3v18M4.2 7.5l15.6 9M19.8 7.5l-15.6 9" />
      <path d="m12 3-2 2M12 3l2 2M12 21l-2-2M12 21l2-2" />
    </>
  ),
  trophy: (
    <>
      <path d="M8 4h8v6a4 4 0 0 1-8 0V4Z" />
      <path d="M8 6H4.5c0 3 1.5 4.5 3.5 5M16 6h3.5c0 3-1.5 4.5-3.5 5" />
      <path d="M12 14v3.5M8.5 20.5h7M10 17.5h4" />
    </>
  ),
  heart: (
    <path d="M12 20S4 14.7 4 9.6C4 7 6 5 8.4 5c1.5 0 2.8.8 3.6 2 .8-1.2 2.1-2 3.6-2C18 5 20 7 20 9.6c0 5.1-8 10.4-8 10.4Z" />
  ),
  atom: (
    <>
      <circle cx="12" cy="12" r="1.2" fill="currentColor" />
      <ellipse cx="12" cy="12" rx="9" ry="3.8" />
      <ellipse cx="12" cy="12" rx="9" ry="3.8" transform="rotate(60 12 12)" />
      <ellipse cx="12" cy="12" rx="9" ry="3.8" transform="rotate(120 12 12)" />
    </>
  ),
  compass: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m15.5 8.5-2 5-5 2 2-5 5-2Z" />
    </>
  ),
};

export default function SubjectIcon({ subject, size = 32 }: { subject: string; size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[iconFor(subject)]}
    </svg>
  );
}
