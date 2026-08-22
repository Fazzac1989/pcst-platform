/**
 * Hand-maintained destination facts that don't belong in the database because
 * they never change per-trip: mains electricity standards and the handful of
 * cultural norms a school group should know before landing.
 *
 * Groups depart from Dubai, so the adapter guidance is written relative to the
 * UAE's Type G sockets. Culture notes are deliberately short, factual and
 * widely published — etiquette, not opinion.
 */

export type DestinationNotes = {
  /** IEC plug letters in use, e.g. ['C', 'F'] */
  plugs: string[];
  voltage: string;
  culture: string[];
};

const NOTES: Record<string, DestinationNotes> = {
  australia: {
    plugs: ['I'], voltage: '230V',
    culture: [
      'Australians are informal and first names are used quickly — but queues are respected and punctuality matters.',
      'Strong sun protection is a way of life: hats and sunscreen are expected for any time outdoors.',
      'Always swim between the red-and-yellow flags on patrolled beaches and follow lifeguard instructions.',
    ],
  },
  austria: {
    plugs: ['C', 'F'], voltage: '230V',
    culture: [
      'Greet with a handshake and use polite titles — formality is valued, especially with older people.',
      'Keep voices low on public transport and in restaurants; quiet public behaviour is the norm.',
      'Punctuality is taken seriously — arrive on time for tours, meals and transport.',
    ],
  },
  belgium: {
    plugs: ['C', 'E'], voltage: '230V',
    culture: [
      'Belgium has three official languages — French, Dutch and German — so greetings change by region.',
      'A handshake and a polite "bonjour" or "goedendag" opens most interactions.',
      'Table manners are formal: keep hands visible and wait for everyone before starting.',
    ],
  },
  cambodia: {
    plugs: ['A', 'C', 'G'], voltage: '230V',
    culture: [
      'Greet with the sampeah — palms together with a slight bow — rather than a handshake.',
      'Dress modestly at temples: shoulders and knees covered, shoes and hats off before entering.',
      'Never touch anyone on the head, and avoid pointing your feet at people or Buddha images.',
    ],
  },
  china: {
    plugs: ['A', 'C', 'I'], voltage: '220V',
    culture: [
      'Receive and offer items — especially gifts and business cards — with both hands.',
      'Saving face matters: avoid public criticism or putting anyone on the spot.',
      'Slurping noodles is fine; sticking chopsticks upright in rice is not.',
    ],
  },
  'czech-republic': {
    plugs: ['C', 'E'], voltage: '230V',
    culture: [
      'Say "dobrý den" when entering shops and cafés — greetings are expected.',
      'Keep voices down on trams and trains; loud conversation draws attention.',
      'Remove hats and speak quietly inside churches and historic buildings.',
    ],
  },
  france: {
    plugs: ['C', 'E'], voltage: '230V',
    culture: [
      'Always open with "bonjour" before asking anything — skipping the greeting is considered rude.',
      'Meals are unhurried and phones stay off the table.',
      'Dress neatly for restaurants and churches; casual sportswear stands out.',
    ],
  },
  germany: {
    plugs: ['C', 'F'], voltage: '230V',
    culture: [
      'Punctuality is a courtesy — be on time for everything.',
      'Wait for the green figure before crossing the road, even with no traffic in sight.',
      'Sundays are quiet: most shops close and noise is kept low.',
    ],
  },
  greece: {
    plugs: ['C', 'F'], voltage: '230V',
    culture: [
      'Greeks are warm and expressive — expect conversation and hospitality.',
      'Dress modestly in monasteries and churches: covered shoulders and knees.',
      'Meals run late and long; dinner before 8pm is unusually early.',
    ],
  },
  'hong-kong': {
    plugs: ['G'], voltage: '220V',
    culture: [
      'Stand on the right of escalators and let passengers off the MTR before boarding.',
      'Offer and receive items with both hands, including money and cards.',
      'Eating and drinking on public transport is not allowed.',
    ],
  },
  iceland: {
    plugs: ['C', 'F'], voltage: '230V',
    culture: [
      'Icelanders use first names for everyone — formality is rare, but respect for nature is absolute.',
      'Stay on marked paths: fragile moss and geothermal areas are protected and dangerous.',
      'Showering thoroughly before entering any swimming pool or lagoon is a strict rule.',
    ],
  },
  india: {
    plugs: ['C', 'D', 'M'], voltage: '230V',
    culture: [
      'Greet with "namaste" — palms together — and use your right hand for giving and eating.',
      'Remove shoes before entering temples and homes; dress modestly throughout.',
      'A side-to-side head wobble often means yes or okay, not no.',
    ],
  },
  indonesia: {
    plugs: ['C', 'F'], voltage: '230V',
    culture: [
      'Use your right hand for giving, receiving and eating.',
      'Dress modestly at temples and mosques; a sarong and sash are required at Balinese temples.',
      'Keep calm and smile — raised voices and public anger lose respect quickly.',
    ],
  },
  ireland: {
    plugs: ['G'], voltage: '230V',
    culture: [
      'Conversation and humour are the national pastime — expect friendly chat everywhere.',
      'Queue fairly and thank bus drivers; small courtesies are noticed.',
      'A simple "please" and "thank you" go a very long way.',
    ],
  },
  italy: {
    plugs: ['C', 'F', 'L'], voltage: '230V',
    culture: [
      'Cover shoulders and knees to enter churches — this is enforced at major basilicas.',
      'Cappuccino is a morning drink; after lunch, Italians switch to espresso.',
      'Greet shopkeepers when entering and leaving — service is a conversation, not a transaction.',
    ],
  },
  japan: {
    plugs: ['A', 'B'], voltage: '100V',
    culture: [
      'Bowing is the standard greeting; a small nod from visitors is appreciated.',
      'Keep quiet on trains — phone calls are not made on public transport.',
      'Shoes come off in homes, temples and some restaurants; eating while walking is avoided.',
    ],
  },
  jordan: {
    plugs: ['C', 'D', 'F', 'G', 'J'], voltage: '230V',
    culture: [
      'Jordanian hospitality is generous — accepting tea or coffee honours the host.',
      'Dress modestly, especially outside tourist sites: shoulders and knees covered.',
      'Use the right hand for greetings, giving and eating.',
    ],
  },
  kenya: {
    plugs: ['G'], voltage: '240V',
    culture: [
      'Greetings matter: take time for a handshake and "jambo" before any request.',
      'Ask permission before photographing people.',
      'On safari, keep quiet, stay in the vehicle and follow your guide without exception.',
    ],
  },
  'london-france-and-belgium': {
    plugs: ['G', 'C', 'E'], voltage: '230V',
    culture: [
      'In London, stand on the right of escalators and let passengers off the Tube first.',
      'In France and Belgium, always open with "bonjour" before asking anything.',
      'Queueing is sacred in Britain; meals are unhurried on the continent.',
    ],
  },
  mongolia: {
    plugs: ['C', 'E'], voltage: '230V',
    culture: [
      'When entering a ger, move clockwise and accept offered food or drink with the right hand.',
      'Never step on the threshold of a ger — step over it.',
      'Hospitality is central to nomadic life; refusing it outright can offend.',
    ],
  },
  nepal: {
    plugs: ['C', 'D', 'M'], voltage: '230V',
    culture: [
      'Greet with "namaste" and use your right hand for giving and receiving.',
      'Walk clockwise around stupas and temples, and remove shoes before entering.',
      'Public displays of affection are frowned upon; dress modestly.',
    ],
  },
  netherlands: {
    plugs: ['C', 'F'], voltage: '230V',
    culture: [
      'The Dutch are famously direct — plain speaking is politeness, not rudeness.',
      'Watch for bicycles everywhere: never walk in the bike lane.',
      'Being on time is expected, and appointments are kept precisely.',
    ],
  },
  'new-zealand': {
    plugs: ['I'], voltage: '230V',
    culture: [
      'Māori culture is living culture: a pōwhiri (welcome ceremony) has its own protocol — follow your hosts.',
      'Remove shoes when entering a marae or a home.',
      'Kiwis are relaxed and modest; boasting sits badly.',
    ],
  },
  oman: {
    plugs: ['G'], voltage: '240V',
    culture: [
      'Dress modestly in public — shoulders and knees covered for everyone.',
      'Use the right hand for greetings, giving and eating.',
      'Ask before photographing people, especially women.',
    ],
  },
  'saudi-arabia': {
    plugs: ['G'], voltage: '230V',
    culture: [
      'Dress modestly: loose clothing covering shoulders and knees for all visitors.',
      'Public behaviour is conservative — keep displays of affection private.',
      'During Ramadan, avoid eating or drinking in public in daylight hours.',
    ],
  },
  singapore: {
    plugs: ['G'], voltage: '230V',
    culture: [
      'Rules are enforced: no eating or drinking on the MRT, no littering, no chewing gum.',
      'Singapore is multicultural — mosques, temples and churches each have their own etiquette.',
      'Queue properly, and on escalators stand on the left and walk on the right.',
    ],
  },
  'south-africa': {
    plugs: ['C', 'D', 'M', 'N'], voltage: '230V',
    culture: [
      'Greetings come first — a handshake and "howzit" before business.',
      'South Africa has eleven official languages; English works everywhere but effort is appreciated.',
      'On safari, follow ranger instructions exactly and never leave the vehicle unprompted.',
    ],
  },
  'south-korea': {
    plugs: ['C', 'F'], voltage: '220V',
    culture: [
      'Give and receive with both hands, and bow slightly when greeting.',
      'Elders come first: let them sit, eat and enter before you.',
      'Keep quiet on public transport and queue for the metro doors at the marked lines.',
    ],
  },
  spain: {
    plugs: ['C', 'F'], voltage: '230V',
    culture: [
      'Meal times run late: lunch around 2pm, dinner rarely before 9pm.',
      'Greetings are warm — expect two kisses on the cheek in social settings.',
      'Cover shoulders and knees for cathedrals and churches.',
    ],
  },
  'sri-lanka': {
    plugs: ['D', 'G', 'M'], voltage: '230V',
    culture: [
      'Never pose for photographs with your back to a Buddha statue.',
      'Remove shoes and hats at temples, and cover shoulders and knees.',
      'Use your right hand for giving, receiving and eating.',
    ],
  },
  switzerland: {
    plugs: ['C', 'J'], voltage: '230V',
    culture: [
      'Punctuality is near-sacred — trains, tours and meals run to the minute.',
      'Quiet is valued: keep noise down in public, especially in the evening.',
      'Greet with "grüezi", "bonjour" or "buongiorno" depending on the region.',
    ],
  },
  turkey: {
    plugs: ['C', 'F'], voltage: '230V',
    culture: [
      'Remove shoes before entering mosques; women should carry a headscarf for visits.',
      'Tea is the currency of hospitality — accepting a glass is a compliment to the host.',
      'Dress modestly at religious sites: shoulders and knees covered.',
    ],
  },
  uganda: {
    plugs: ['G'], voltage: '240V',
    culture: [
      'Greetings are unhurried and important — ask how someone is before anything else.',
      'Ask permission before photographing people.',
      'Modest dress is appreciated, particularly outside the capital.',
    ],
  },
  'united-arab-emirates': {
    plugs: ['G'], voltage: '230V',
    culture: [
      'Dress modestly in malls and public places — shoulders and knees covered.',
      'Public displays of affection are kept private.',
      'During Ramadan, eating and drinking in public daylight is restricted.',
    ],
  },
  'united-kingdom': {
    plugs: ['G'], voltage: '230V',
    culture: [
      'Queueing is a national institution — never jump one.',
      'Stand on the right of escalators, especially on the London Underground.',
      '"Please", "thank you" and "sorry" are used constantly — match the habit.',
    ],
  },
  usa: {
    plugs: ['A', 'B'], voltage: '120V',
    culture: [
      'Tipping is expected: 18–20% in restaurants and a few dollars for services.',
      'Small talk with strangers is normal and friendly, not intrusive.',
      'Sales tax is added at the till, so shelf prices are not the final price.',
    ],
  },
  vietnam: {
    plugs: ['A', 'C', 'F'], voltage: '220V',
    culture: [
      'Use both hands to give and receive, and remove shoes when entering homes and temples.',
      'Keep calm in negotiations and conversation — losing your temper loses respect.',
      'Dress modestly at pagodas and memorial sites.',
    ],
  },
  zambia: {
    plugs: ['C', 'D', 'G'], voltage: '230V',
    culture: [
      'Greetings come before everything — a handshake and genuine interest are expected.',
      'Ask permission before photographing people.',
      'On river and safari activities, follow your guide’s instructions without exception.',
    ],
  },
};

export function getDestinationNotes(countrySlug: string): DestinationNotes | null {
  return NOTES[countrySlug] ?? null;
}

/** "Type G · 230V" — the at-a-glance rendering of the mains standard. */
export function plugSummary(notes: DestinationNotes): string {
  return `Type ${notes.plugs.join(' / ')} · ${notes.voltage}`;
}

/**
 * Adapter advice relative to the UAE's Type G sockets, for groups packing in
 * Dubai. Null when no guidance is needed beyond the summary.
 */
export function adapterAdvice(notes: DestinationNotes): string | null {
  if (notes.plugs.includes('G')) return 'Same sockets as the UAE — no adapter needed.';
  const advice = `Bring a Type ${notes.plugs.join(' or ')} adapter — UAE plugs won't fit.`;
  const volts = parseInt(notes.voltage, 10);
  if (!Number.isNaN(volts) && volts < 200) {
    return `${advice} Voltage is lower than the UAE; check hair dryers and styling tools are dual-voltage.`;
  }
  return advice;
}
