import { Document, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import type { ItineraryDayView, JourneyLeg } from '@/lib/itinerary/schema';

/**
 * A printable version of a trip page — the itinerary a teacher forwards to a
 * head of department, prints for a parents' evening, or attaches to a risk
 * assessment.
 *
 * The structured layer is used for the scannable summary where a trip has been
 * through extraction, but the operator's original day description is always
 * printed underneath it, exactly as on the website.
 */

const INK = '#16242E';
const INK_SOFT = '#425964';
const TEAL = '#19BAAB';
const TEAL_DEEP = '#12897E';
const LINE = '#DDE1E4';

const s = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 10, color: INK, paddingBottom: 64 },
  cover: { backgroundColor: INK, color: '#FFFFFF', padding: 48, minHeight: '100%' },
  coverEyebrow: { fontSize: 9, letterSpacing: 2.4, textTransform: 'uppercase', color: TEAL, marginTop: 40, marginBottom: 12 },
  coverTitle: { fontSize: 30, lineHeight: 1.15, marginBottom: 24 },
  coverImage: { width: '100%', height: 240, objectFit: 'cover', borderRadius: 3, marginBottom: 28 },
  coverMetaRow: { flexDirection: 'row', flexWrap: 'wrap' },
  coverMetaCell: { marginRight: 30, marginBottom: 12 },
  coverMetaLabel: { fontSize: 7.5, letterSpacing: 1.6, textTransform: 'uppercase', color: TEAL, marginBottom: 3 },
  coverMetaValue: { fontSize: 11, color: '#FFFFFF' },

  body: { paddingHorizontal: 48, paddingTop: 44 },
  eyebrow: { fontSize: 8, letterSpacing: 2, textTransform: 'uppercase', color: TEAL_DEEP, marginBottom: 6 },
  h2: { fontSize: 19, marginBottom: 14, color: INK },
  para: { fontSize: 10, color: INK_SOFT, lineHeight: 1.6, marginBottom: 9 },

  journeyRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 20 },
  journeyLeg: { marginRight: 8, marginBottom: 6, borderWidth: 1, borderColor: LINE, borderRadius: 3, paddingVertical: 5, paddingHorizontal: 9 },
  journeyPlace: { fontSize: 10, fontFamily: 'Helvetica-Bold' },
  journeyDays: { fontSize: 7.5, color: INK_SOFT, marginTop: 1 },

  highlightsBox: { backgroundColor: '#F5F7F8', borderRadius: 3, padding: 16, marginBottom: 24 },
  highlightItem: { flexDirection: 'row', marginBottom: 5 },
  bullet: { width: 12, color: TEAL_DEEP },

  day: { marginBottom: 20, borderBottomWidth: 1, borderBottomColor: LINE, paddingBottom: 16 },
  dayHead: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 5 },
  dayLabel: { fontSize: 8, letterSpacing: 1.6, textTransform: 'uppercase', color: TEAL_DEEP, width: 62 },
  dayTitle: { fontSize: 13, fontFamily: 'Helvetica-Bold', flex: 1 },
  daySummary: { fontSize: 10, color: INK, fontFamily: 'Helvetica-Oblique', lineHeight: 1.5, marginBottom: 8 },
  dayMetaRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 },
  chip: { fontSize: 7.5, color: INK_SOFT, borderWidth: 1, borderColor: LINE, borderRadius: 2, paddingVertical: 2, paddingHorizontal: 5, marginRight: 5, marginBottom: 4 },
  hl: { flexDirection: 'row', marginBottom: 4 },
  hlName: { fontFamily: 'Helvetica-Bold', fontSize: 9.5 },
  hlText: { fontSize: 9.5, color: INK_SOFT, flex: 1 },
  conditional: { fontSize: 8.5, color: TEAL_DEEP, fontFamily: 'Helvetica-Oblique' },
  dayText: { fontSize: 9.5, color: INK_SOFT, lineHeight: 1.55, marginTop: 6 },

  includeRow: { flexDirection: 'row', marginBottom: 6 },
  tick: { width: 14, color: TEAL_DEEP },

  factsRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 },
  factCell: { width: '33%', marginBottom: 10, paddingRight: 10 },
  factLabel: { fontSize: 7.5, letterSpacing: 1.4, textTransform: 'uppercase', color: TEAL_DEEP, marginBottom: 2 },
  factValue: { fontSize: 10 },

  term: { flexDirection: 'row', marginBottom: 7 },
  termNum: { width: 18, color: TEAL_DEEP, fontFamily: 'Helvetica-Oblique' },
  termText: { flex: 1, fontSize: 8.5, color: INK_SOFT, lineHeight: 1.5 },

  galleryRow: { flexDirection: 'row', marginTop: 18 },
  galleryImg: { flex: 1, height: 110, objectFit: 'cover', borderRadius: 3, marginRight: 6 },

  footer: {
    position: 'absolute', bottom: 24, left: 48, right: 48,
    flexDirection: 'row', justifyContent: 'space-between',
    fontSize: 8, color: INK_SOFT, borderTopWidth: 1, borderTopColor: LINE, paddingTop: 8,
  },
});

export type TripDocProps = {
  trip: {
    title: string;
    slug: string;
    city: string | null;
    countryName: string | null;
    subjectName: string | null;
    durationDays: number;
    durationNights: number;
    departs: string | null;
    overview: string[];
    includes: string[];
  };
  days: ItineraryDayView[];
  journey: JourneyLeg[];
  highlights: string[];
  heroImage: string | null;
  galleryImages: string[];
  countryFacts: { label: string; value: string }[];
  terms: string[];
  siteUrl: string;
};

const legLabel = (leg: JourneyLeg) =>
  leg.fromDay === leg.toDay ? `Day ${leg.fromDay}` : `Days ${leg.fromDay}–${leg.toDay}`;

function Footer({ title }: { title: string }) {
  return (
    <View style={s.footer} fixed>
      <Text>{title} · Premium Choice School Trips</Text>
      <Text
        render={({ pageNumber, totalPages }) =>
          `+971 4 420 6965 · info@premiumchoicetravel.com · ${pageNumber}/${totalPages}`
        }
      />
    </View>
  );
}

export default function TripDoc({
  trip,
  days,
  journey,
  highlights,
  heroImage,
  galleryImages,
  countryFacts,
  terms,
  siteUrl,
}: TripDocProps) {
  const where = [trip.city, trip.countryName].filter(Boolean).join(', ');
  const duration =
    trip.durationDays > 0 ? `${trip.durationDays} days / ${trip.durationNights} nights` : null;

  return (
    <Document title={trip.title} author="Premium Choice School Trips" subject={where}>
      {/* Cover */}
      <Page size="A4" style={s.page}>
        <View style={s.cover}>
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image src={`${siteUrl}/images/logo-white.png`} style={{ height: 44, width: 177 }} />

          <Text style={s.coverEyebrow}>
            {trip.subjectName ? `${trip.subjectName} · ` : ''}School trip itinerary
          </Text>
          <Text style={s.coverTitle}>{trip.title}</Text>

          {heroImage ? (
            // eslint-disable-next-line jsx-a11y/alt-text
            <Image src={heroImage} style={s.coverImage} />
          ) : null}

          <View style={s.coverMetaRow}>
            {where ? (
              <View style={s.coverMetaCell}>
                <Text style={s.coverMetaLabel}>Destination</Text>
                <Text style={s.coverMetaValue}>{where}</Text>
              </View>
            ) : null}
            {duration ? (
              <View style={s.coverMetaCell}>
                <Text style={s.coverMetaLabel}>Duration</Text>
                <Text style={s.coverMetaValue}>{duration}</Text>
              </View>
            ) : null}
            {trip.departs ? (
              <View style={s.coverMetaCell}>
                <Text style={s.coverMetaLabel}>Departs from</Text>
                <Text style={s.coverMetaValue}>{trip.departs}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </Page>

      {/* Overview, journey, highlights */}
      <Page size="A4" style={s.page}>
        <View style={s.body}>
          <Text style={s.eyebrow}>The trip</Text>
          <Text style={s.h2}>Overview</Text>
          {trip.overview.map((p, i) => (
            <Text key={i} style={s.para}>
              {p}
            </Text>
          ))}

          {journey.length > 0 && (
            <>
              <Text style={[s.eyebrow, { marginTop: 18 }]}>Your journey</Text>
              <View style={s.journeyRow}>
                {journey.map((leg, i) => (
                  <View key={i} style={s.journeyLeg}>
                    <Text style={s.journeyPlace}>{leg.location}</Text>
                    <Text style={s.journeyDays}>{legLabel(leg)}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {highlights.length > 0 && (
            <View style={s.highlightsBox}>
              <Text style={s.eyebrow}>Trip highlights</Text>
              {highlights.map((h, i) => (
                <View key={i} style={s.highlightItem}>
                  <Text style={s.bullet}>·</Text>
                  <Text style={{ flex: 1 }}>{h}</Text>
                </View>
              ))}
            </View>
          )}

          {countryFacts.length > 0 && (
            <>
              <Text style={s.eyebrow}>
                {trip.countryName ? `About ${trip.countryName}` : 'About the destination'}
              </Text>
              <View style={s.factsRow}>
                {countryFacts.map((f) => (
                  <View key={f.label} style={s.factCell}>
                    <Text style={s.factLabel}>{f.label}</Text>
                    <Text style={s.factValue}>{f.value}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {galleryImages.length > 0 && (
            <View style={s.galleryRow}>
              {galleryImages.slice(0, 3).map((src, i) => (
                // eslint-disable-next-line jsx-a11y/alt-text
                <Image key={i} src={src} style={s.galleryImg} />
              ))}
            </View>
          )}
        </View>
        <Footer title={trip.title} />
      </Page>

      {/* Day by day */}
      <Page size="A4" style={s.page}>
        <View style={s.body}>
          <Text style={s.eyebrow}>Day by day</Text>
          <Text style={s.h2}>Your itinerary</Text>

          {days.map((day, i) => {
            const st = day.structured;
            const meals = st?.meals ?? [];
            const transport = st?.transport ?? [];
            return (
              <View key={day.id} style={s.day} wrap={false}>
                <View style={s.dayHead}>
                  <Text style={s.dayLabel}>{day.label ?? `Day ${i + 1}`}</Text>
                  <Text style={s.dayTitle}>{st?.displayTitle || day.title}</Text>
                </View>

                {st?.summary ? <Text style={s.daySummary}>{st.summary}</Text> : null}

                {(meals.length > 0 || transport.length > 0 || st?.primaryLocation) && (
                  <View style={s.dayMetaRow}>
                    {st?.primaryLocation ? <Text style={s.chip}>{st.primaryLocation}</Text> : null}
                    {meals.map((m) => (
                      <Text key={m} style={s.chip}>
                        {m}
                      </Text>
                    ))}
                    {transport.map((t, j) => (
                      <Text key={j} style={s.chip}>
                        {t.mode}
                        {t.from && t.to ? ` ${t.from} → ${t.to}` : ''}
                      </Text>
                    ))}
                  </View>
                )}

                {(st?.highlights ?? []).map((h, j) => (
                  <View key={j} style={s.hl}>
                    <Text style={s.bullet}>·</Text>
                    <Text style={s.hlText}>
                      <Text style={s.hlName}>{h.name}</Text>
                      {h.summary ? ` — ${h.summary}` : ''}
                      {h.conditional && h.conditionalText ? (
                        <Text style={s.conditional}> ({h.conditionalText})</Text>
                      ) : null}
                    </Text>
                  </View>
                ))}

                {/* The operator's own words, always printed. */}
                <Text style={s.dayText}>{day.description}</Text>

                {(st?.notices ?? []).map((n, j) => (
                  <Text key={j} style={[s.conditional, { marginTop: 4 }]}>
                    {n}
                  </Text>
                ))}
              </View>
            );
          })}
        </View>
        <Footer title={trip.title} />
      </Page>

      {/* What's included and terms */}
      <Page size="A4" style={s.page}>
        <View style={s.body}>
          {trip.includes.length > 0 && (
            <>
              <Text style={s.eyebrow}>Your trip includes</Text>
              <Text style={s.h2}>What&apos;s included</Text>
              {trip.includes.map((item, i) => (
                <View key={i} style={s.includeRow}>
                  <Text style={s.tick}>✓</Text>
                  <Text style={{ flex: 1, color: INK_SOFT }}>{item}</Text>
                </View>
              ))}
            </>
          )}

          {terms.length > 0 && (
            <>
              <Text style={[s.eyebrow, { marginTop: 28 }]}>The small print</Text>
              <Text style={s.h2}>Booking terms</Text>
              {terms.map((t, i) => (
                <View key={i} style={s.term}>
                  <Text style={s.termNum}>{i + 1}.</Text>
                  <Text style={s.termText}>{t}</Text>
                </View>
              ))}
            </>
          )}

          <Text style={[s.para, { marginTop: 28, fontSize: 9 }]}>
            This itinerary is a guide. Timings and the order of activities may change to suit flight
            schedules, opening hours, local conditions and the needs of your group. See it online at{' '}
            {siteUrl.replace('https://', '')}/trips/{trip.slug}
          </Text>
        </View>
        <Footer title={trip.title} />
      </Page>
    </Document>
  );
}
