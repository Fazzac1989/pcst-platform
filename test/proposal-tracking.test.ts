import { describe, expect, it } from 'vitest';
import { isOwnRenderer, looksLikeBot } from '@/lib/brochure/proposal-tracking';

/**
 * A view count is only worth having if it means a person looked.
 *
 * A proposal is sent by email, so the link is fetched by mail scanners, chat
 * previewers and our own PDF renderer before any teacher opens it. Counting
 * those is worse than counting nothing, because the number is what a follow-up
 * call gets based on.
 */

const CHROME =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const SAFARI_IOS =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const FIREFOX = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:130.0) Gecko/20100101 Firefox/130.0';
const EDGE =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0';

describe('looksLikeBot', () => {
  it('lets real browsers through', () => {
    for (const ua of [CHROME, SAFARI_IOS, FIREFOX, EDGE]) {
      expect(looksLikeBot(ua), ua.slice(0, 40)).toBe(false);
    }
  });

  it('catches the chat and mail previewers that open a sent link', () => {
    const previewers = [
      'WhatsApp/2.23.20.0 A',
      'Mozilla/5.0 (compatible; facebookexternalhit/1.1)',
      'Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)',
      'Mozilla/5.0 (compatible; TelegramBot)',
      'Mozilla/5.0 (compatible; Discordbot/2.0)',
      'Twitterbot/1.0',
      'LinkedInBot/1.0',
      'Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.1; SkypeUriPreview Preview/0.5)',
      'Mozilla/5.0 (Windows NT 10.0) Microsoft Office Word 2016',
    ];
    for (const ua of previewers) {
      expect(looksLikeBot(ua), ua.slice(0, 40)).toBe(true);
    }
  });

  it('catches crawlers and monitors', () => {
    for (const ua of ['Googlebot/2.1', 'bingbot/2.0', 'YandexBot/3.0', 'UptimeRobot/2.0', 'Pingdom.com_bot']) {
      expect(looksLikeBot(ua), ua).toBe(true);
    }
  });

  it('catches scripted fetches', () => {
    for (const ua of ['curl/8.4.0', 'Wget/1.21', 'python-requests/2.31.0', 'node-fetch/1.0']) {
      expect(looksLikeBot(ua), ua).toBe(true);
    }
  });

  it('treats a missing user agent as not a person', () => {
    expect(looksLikeBot(null)).toBe(true);
    expect(looksLikeBot(undefined)).toBe(true);
    expect(looksLikeBot('')).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(looksLikeBot('GOOGLEBOT/2.1')).toBe(true);
    expect(looksLikeBot('WhatsApp/2.0')).toBe(true);
  });
});

describe('isOwnRenderer', () => {
  it('recognises our PDF build, which opens the page on every render', () => {
    // Counting these would double every download: the PDF route already
    // records a pdf_downloaded event for the same load.
    expect(
      isOwnRenderer(
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/131.0.0.0 Safari/537.36',
      ),
    ).toBe(true);
  });

  it('does not mistake an ordinary browser for the renderer', () => {
    expect(isOwnRenderer(CHROME)).toBe(false);
    expect(isOwnRenderer(null)).toBe(false);
  });
});
