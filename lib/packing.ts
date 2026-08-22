import { getDestinationNotes, adapterAdvice } from './destination-notes';

/**
 * A rules-based packing checklist per trip: everyone gets the essentials, the
 * subject decides the kit, the destination decides the extras. Deterministic
 * on purpose — a checklist is a promise, so nothing here is generated.
 */

export type PackingGroup = { title: string; items: string[] };

type PackingInput = {
  subject: string;
  country: string;
  countrySlug: string;
  durationDays: number;
  avgTempC: number | null;
};

/** Countries where itineraries routinely include mosques, temples or churches with dress codes. */
const MODEST_DRESS = new Set([
  'jordan', 'oman', 'saudi-arabia', 'united-arab-emirates', 'turkey', 'india', 'sri-lanka',
  'nepal', 'cambodia', 'indonesia', 'vietnam', 'italy', 'greece', 'spain',
]);

/** Destinations where repellent belongs in every bag. */
const INSECT_REPELLENT = new Set([
  'kenya', 'uganda', 'zambia', 'cambodia', 'vietnam', 'sri-lanka', 'indonesia', 'india', 'nepal',
]);

function subjectKit(subject: string): string[] {
  const s = subject.toLowerCase();
  if (s.includes('ski')) {
    return [
      'Thermal base layers and ski socks',
      'Waterproof gloves, warm hat and neck warmer',
      'Ski goggles and high-SPF sunscreen with lip balm',
      'Swimwear for pool or spa evenings',
    ];
  }
  if (s.includes('outdoor') || s.includes('adventure') || s.includes('duke')) {
    return [
      'Sturdy walking boots, worn in before travel',
      'Waterproof jacket and trousers',
      'Quick-dry layers and a warm fleece',
      'Head torch and refillable water bottle',
    ];
  }
  if (s.includes('geograph') || s.includes('environment') || s.includes('biolog')) {
    return [
      'Fieldwork notebook, pencils and clipboard',
      'Waterproof jacket and sturdy footwear for field days',
      'Camera or phone for recording field sites',
    ];
  }
  if (s.includes('sport') || s.includes('football') || s.includes('rugby') || s.includes('netball')) {
    return [
      'Full playing kit and boots for every fixture',
      'Shin pads, mouthguard and any protective wear',
      'Trainers for training days and swimwear for recovery sessions',
      'Team kit bag with a change of clothes for after matches',
    ];
  }
  if (s.includes('art') || s.includes('design') || s.includes('photograph')) {
    return [
      'Sketchbook, drawing pencils and a small kit of dry media',
      'Camera or phone with plenty of storage',
      'Comfortable shoes for long gallery days',
    ];
  }
  if (s.includes('music') || s.includes('performing') || s.includes('drama') || s.includes('dance')) {
    return [
      'Performance dress as directed by your teacher',
      'Instrument, accessories and spares if you are performing',
      'Comfortable clothes for workshops and rehearsals',
    ];
  }
  if (s.includes('business') || s.includes('econom')) {
    return [
      'One smart-casual outfit for company visits',
      'Notebook and pen for talks and Q&A sessions',
      'Comfortable shoes for city walking days',
    ];
  }
  if (s.includes('volunteer') || s.includes('service')) {
    return [
      'Old clothes you can work in, plus sturdy boots',
      'Work gloves and a sun hat',
      'A small gift or supplies if your teacher has arranged them',
    ];
  }
  if (s.includes('language') || s.includes('french') || s.includes('spanish') || s.includes('german')) {
    return [
      'Phrase notes or a pocket dictionary',
      'Notebook for new vocabulary',
      'Comfortable shoes for exploring on foot',
    ];
  }
  if (s.includes('steam') || s.includes('science') || s.includes('technolog') || s.includes('math')) {
    return [
      'Notebook and pen for demonstrations and workshops',
      'Camera or phone for recording experiments and exhibits',
      'Comfortable shoes for museum and lab days',
    ];
  }
  if (s.includes('relig') || s.includes('philosoph') || s.includes('ethic')) {
    return [
      'Modest clothing for places of worship',
      'A scarf or head covering where required',
      'Notebook for reflections and discussions',
    ];
  }
  // History, classics, politics, English and everything else built on site visits.
  return [
    'Notebook and pen for site visits and talks',
    'Camera or phone for recording what you see',
    'Comfortable, broken-in walking shoes',
  ];
}

function destinationKit(input: PackingInput): string[] {
  const items: string[] = [];
  const notes = getDestinationNotes(input.countrySlug);
  if (notes) {
    const advice = adapterAdvice(notes);
    if (advice) items.push(advice.startsWith('Same') ? 'Chargers — UAE plugs fit the sockets, no adapter needed' : advice);
  } else {
    items.push('Universal travel adapter');
  }

  if (input.avgTempC !== null) {
    if (input.avgTempC >= 25) items.push('Sun hat, sunglasses and high-SPF sunscreen', 'Light, breathable layers');
    else if (input.avgTempC <= 8) items.push('Warm coat, hat and gloves', 'Thermal layers for cold days');
    else items.push('Layers for warm days and cool evenings', 'A light waterproof jacket');
  } else {
    items.push('Layers for changeable weather', 'A light waterproof jacket');
  }

  if (MODEST_DRESS.has(input.countrySlug)) {
    items.push('Modest clothing for places of worship — shoulders and knees covered');
  }
  if (INSECT_REPELLENT.has(input.countrySlug)) {
    items.push('Insect repellent and long sleeves for the evenings');
  }
  return items;
}

export function packingList(input: PackingInput): PackingGroup[] {
  return [
    {
      title: 'The essentials',
      items: [
        'Passport with at least six months’ validity, plus a paper copy',
        'Any personal medication, named and in hand luggage',
        'Phone and charger',
        'Refillable water bottle and a small daypack',
        'A modest amount of spending money',
      ],
    },
    { title: `For ${input.subject}`, items: subjectKit(input.subject) },
    { title: `For ${input.country}`, items: destinationKit(input) },
  ];
}
