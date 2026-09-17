import { describe, expect, it } from 'vitest';
import { legacyRedirects } from '@/lib/legacy-redirects.mjs';
import map from '@/lib/generated/legacy-redirects.json';

const all = legacyRedirects(map as any);
const find = (source: string, key?: string, value?: string) =>
  all.find((r: any) => r.source === source && (key ? r.has?.[0]?.key === key && r.has?.[0]?.value === value : !r.has));

describe("the old site's addresses", () => {
  it('send a trip id to its new page, in both the path and query forms', () => {
    // Indexed by Google on 3 September 2026.
    expect(find('/trips&id=79')?.destination).toBe('/trips/japan-business-studies');
    expect(find('/trips', 'id', '79')?.destination).toBe('/trips/japan-business-studies');
    expect(find('/trips&id=11')?.destination).toBe('/trips/brussels-space-and-science-trip');
    expect(find('/trips&id=53')?.destination).toBe('/trips/school-football-tour-to-holland');
    expect(find('/trips&id=69')?.destination).toBe('/trips/paris-and-nice-language-trip');
  });

  it('send a subject or country id to its page', () => {
    expect(find('/trips&sid=21')?.destination).toBe('/subjects/english-literature');
    expect(find('/trips&cid=60')?.destination).toBe('/countries/germany');
    expect(find('/trips&cid=156')?.destination).toBe('/countries/kenya');
  });

  it('send a trip that is no longer published to the index, not a draft', () => {
    // Les Elfes is a draft; its old link must not land on a page that 404s.
    expect(find('/trips&id=55')?.destination).toBe('/trips');
  });

  it('catch anything else in the old scheme rather than 404', () => {
    expect(find('/trips&:rest*')?.destination).toBe('/trips');
    expect(find('/index.php')?.destination).toBe('/');
  });

  it('are all permanent, and never point at a draft', () => {
    expect(all.every((r: any) => r.permanent === true)).toBe(true);
    const drafts = ['les-elfes-ski-trip', 'nepal-volunteering', 'rugby-tour-to-dublin', 'space-camp-turkey', 'china-trip'];
    expect(all.some((r: any) => drafts.some((d) => r.destination.endsWith(d)))).toBe(false);
  });
});
