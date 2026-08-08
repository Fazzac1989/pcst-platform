import { Document, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import { formatMoney, lineTotal, perStudent, quoteTotal, type Quote } from '@/lib/quotes';

const INK = '#16242E';
const INK_SOFT = '#425964';
const TEAL = '#19BAAB';
const TEAL_DEEP = '#12897E';
const LINE = '#DDE1E4';

const s = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 10, color: INK, paddingBottom: 64 },
  cover: { backgroundColor: INK, color: '#FFFFFF', padding: 48, minHeight: '100%' },
  coverLogos: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 56 },
  coverEyebrow: { fontSize: 9, letterSpacing: 2.4, textTransform: 'uppercase', color: TEAL, marginBottom: 12 },
  coverTitle: { fontSize: 30, fontFamily: 'Helvetica', lineHeight: 1.15, marginBottom: 28 },
  coverImage: { width: '100%', height: 240, objectFit: 'cover', borderRadius: 3, marginBottom: 32 },
  coverMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 24 },
  coverMetaCell: { marginRight: 28, marginBottom: 12 },
  coverMetaLabel: { fontSize: 7.5, letterSpacing: 1.6, textTransform: 'uppercase', color: TEAL, marginBottom: 3 },
  coverMetaValue: { fontSize: 11, color: '#FFFFFF' },
  body: { padding: 48 },
  eyebrow: { fontSize: 8, letterSpacing: 2, textTransform: 'uppercase', color: TEAL_DEEP, marginBottom: 6 },
  h2: { fontSize: 20, marginBottom: 18, color: INK },
  day: { flexDirection: 'row', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: LINE },
  dayLabel: { width: 70, fontSize: 10, color: TEAL_DEEP, fontFamily: 'Helvetica-Oblique' },
  dayContent: { flex: 1 },
  dayTitle: { fontSize: 11, fontFamily: 'Helvetica-Bold', marginBottom: 3 },
  dayText: { fontSize: 9.5, color: INK_SOFT, lineHeight: 1.5 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: LINE },
  priceDesc: { flex: 1, paddingRight: 12, color: INK_SOFT },
  priceAmt: { width: 110, textAlign: 'right' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderTopWidth: 2, borderTopColor: INK, marginTop: 4 },
  totalLabel: { fontFamily: 'Helvetica-Bold', fontSize: 12 },
  pps: { backgroundColor: INK, color: '#FFFFFF', padding: 20, borderRadius: 3, marginTop: 24, alignItems: 'center' },
  ppsAmount: { fontSize: 22, color: TEAL, marginBottom: 4 },
  ppsLabel: { fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', color: '#FFFFFF' },
  term: { flexDirection: 'row', marginBottom: 8 },
  termNum: { width: 20, color: TEAL_DEEP, fontFamily: 'Helvetica-Oblique' },
  termText: { flex: 1, fontSize: 9, color: INK_SOFT, lineHeight: 1.5 },
  footer: {
    position: 'absolute', bottom: 24, left: 48, right: 48,
    flexDirection: 'row', justifyContent: 'space-between',
    fontSize: 8, color: INK_SOFT, borderTopWidth: 1, borderTopColor: LINE, paddingTop: 8,
  },
  galleryRow: { flexDirection: 'row', gap: 8, marginTop: 20 },
  galleryImg: { flex: 1, height: 120, objectFit: 'cover', borderRadius: 3 },
});

function Footer({ quote }: { quote: Quote }) {
  return (
    <View style={s.footer} fixed>
      <Text>
        {quote.ref} · Premium Choice School Trips · Dubai, UAE
      </Text>
      <Text>+971 4 420 6965 · info@premiumchoicetravel.com</Text>
    </View>
  );
}

export default function QuoteDoc({ quote, siteUrl }: { quote: Quote; siteUrl: string }) {
  const total = quoteTotal(quote.lines);
  const pps = perStudent(quote.lines, quote.pupils);
  const cover = quote.images[0];
  const gallery = quote.images.slice(1, 4);

  return (
    <Document title={`${quote.title} — ${quote.ref}`} author="Premium Choice School Trips">
      {/* Cover */}
      <Page size="A4" style={s.page}>
        <View style={s.cover}>
          <View style={s.coverLogos}>
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image src={`${siteUrl}/images/logo-white.png`} style={{ height: 44, width: 177 }} />
            {quote.schoolLogo ? (
              // eslint-disable-next-line jsx-a11y/alt-text
              <Image src={quote.schoolLogo} style={{ height: 44, maxWidth: 140, objectFit: 'contain' }} />
            ) : null}
          </View>
          <Text style={s.coverEyebrow}>Personalised quote · {quote.ref}</Text>
          <Text style={s.coverTitle}>{quote.title}</Text>
          {cover ? (
            // eslint-disable-next-line jsx-a11y/alt-text
            <Image src={cover} style={s.coverImage} />
          ) : null}
          <View style={s.coverMetaRow}>
            {quote.schoolName ? (
              <View style={s.coverMetaCell}>
                <Text style={s.coverMetaLabel}>Prepared for</Text>
                <Text style={s.coverMetaValue}>{quote.schoolName}</Text>
              </View>
            ) : null}
            {quote.teacherName ? (
              <View style={s.coverMetaCell}>
                <Text style={s.coverMetaLabel}>Attention</Text>
                <Text style={s.coverMetaValue}>{quote.teacherName}</Text>
              </View>
            ) : null}
            {quote.travelDates ? (
              <View style={s.coverMetaCell}>
                <Text style={s.coverMetaLabel}>Travel dates</Text>
                <Text style={s.coverMetaValue}>{quote.travelDates}</Text>
              </View>
            ) : null}
            {quote.pupils ? (
              <View style={s.coverMetaCell}>
                <Text style={s.coverMetaLabel}>Group</Text>
                <Text style={s.coverMetaValue}>
                  {quote.pupils} students{quote.staff ? ` + ${quote.staff} staff` : ''}
                </Text>
              </View>
            ) : null}
            {quote.validity ? (
              <View style={s.coverMetaCell}>
                <Text style={s.coverMetaLabel}>Valid until</Text>
                <Text style={s.coverMetaValue}>
                  {new Date(quote.validity).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </Page>

      {/* Itinerary */}
      {quote.itinerary.length > 0 && (
        <Page size="A4" style={s.page}>
          <View style={s.body}>
            <Text style={s.eyebrow}>Day by day</Text>
            <Text style={s.h2}>Your itinerary</Text>
            {quote.itinerary.map((day, i) => (
              <View style={s.day} key={i} wrap={false}>
                <Text style={s.dayLabel}>{day.label}</Text>
                <View style={s.dayContent}>
                  {day.title ? <Text style={s.dayTitle}>{day.title}</Text> : null}
                  <Text style={s.dayText}>{day.description}</Text>
                </View>
              </View>
            ))}
            {gallery.length > 0 && (
              <View style={s.galleryRow}>
                {gallery.map((url, i) => (
                  // eslint-disable-next-line jsx-a11y/alt-text
                  <Image key={i} src={url} style={s.galleryImg} />
                ))}
              </View>
            )}
          </View>
          <Footer quote={quote} />
        </Page>
      )}

      {/* Investment */}
      <Page size="A4" style={s.page}>
        <View style={s.body}>
          <Text style={s.eyebrow}>The numbers</Text>
          <Text style={s.h2}>Your investment</Text>
          {quote.lines.map((l, i) => (
            <View style={s.priceRow} key={i}>
              <Text style={s.priceDesc}>
                {l.description}
                {l.qty !== 1 ? `  (× ${l.qty})` : ''}
              </Text>
              <Text style={s.priceAmt}>{formatMoney(quote.currency, lineTotal(l))}</Text>
            </View>
          ))}
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>Total</Text>
            <Text style={[s.priceAmt, s.totalLabel]}>{formatMoney(quote.currency, total)}</Text>
          </View>
          {pps !== null && (
            <View style={s.pps}>
              <Text style={s.ppsAmount}>{formatMoney(quote.currency, pps)}</Text>
              <Text style={s.ppsLabel}>Per student, all inclusive</Text>
            </View>
          )}
          {quote.staff ? (
            <Text style={{ marginTop: 12, fontSize: 8.5, color: INK_SOFT }}>
              Includes {quote.staff} staff place{quote.staff === 1 ? '' : 's'} free of charge.
            </Text>
          ) : null}
        </View>
        <Footer quote={quote} />
      </Page>

      {/* Terms */}
      {quote.terms.length > 0 && (
        <Page size="A4" style={s.page}>
          <View style={s.body}>
            <Text style={s.eyebrow}>The small print</Text>
            <Text style={s.h2}>Terms & conditions</Text>
            {quote.terms.map((t, i) => (
              <View style={s.term} key={i}>
                <Text style={s.termNum}>{i + 1}.</Text>
                <Text style={s.termText}>{t}</Text>
              </View>
            ))}
          </View>
          <Footer quote={quote} />
        </Page>
      )}
    </Document>
  );
}
