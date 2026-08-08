import { NextResponse, type NextRequest } from 'next/server';
import { createElement } from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import { getQuoteByToken } from '@/lib/quotes';
import QuoteDoc from '@/lib/pdf/quote-doc';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token') ?? '';
  const quote = await getQuoteByToken(token);
  if (!quote) return NextResponse.json({ ok: false, error: 'Quote not found' }, { status: 404 });

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? request.nextUrl.origin;
  try {
    const buffer = await renderToBuffer(createElement(QuoteDoc, { quote, siteUrl }) as any);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${quote.ref} - ${quote.title.replace(/[^\w\s-]/g, '')}.pdf"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (e: any) {
    console.error('[quote pdf]', e.message);
    return NextResponse.json({ ok: false, error: 'PDF generation failed' }, { status: 500 });
  }
}
