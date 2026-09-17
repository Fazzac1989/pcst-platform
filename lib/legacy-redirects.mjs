/**
 * Redirects from the old site's addresses.
 *
 * The site that stood here until August 2026 addressed everything through one
 * path with an ampersand in it: /trips&id=79 for a trip, /trips&sid=21 for a
 * subject, /trips&cid=60 for a country. Google still holds those addresses,
 * and every one of them was answering 404 — which is how a site loses the
 * ranking it had. Each now answers with a permanent redirect to the page
 * that replaced it, so the old links keep working and their standing passes
 * to the new pages.
 *
 * Plain JavaScript because next.config.mjs imports it at build time.
 */

/**
 * @param {{ trips: Record<string, string>, subjects: Record<string, string>, countries: Record<string, string> }} map
 * @returns {import('next').Redirect[]}
 */
export function legacyRedirects(map) {
  const out = [];
  const permanent = true;

  // A trip, by its old id — both the path form the old site used and the
  // query form a browser normalises it to.
  for (const [id, slug] of Object.entries(map.trips)) {
    const destination = slug ? `/trips/${slug}` : '/trips';
    out.push({ source: `/trips&id=${id}`, destination, permanent });
    out.push({ source: '/trips', has: [{ type: 'query', key: 'id', value: id }], destination, permanent });
  }
  for (const [id, slug] of Object.entries(map.subjects)) {
    out.push({ source: `/trips&sid=${id}`, destination: `/subjects/${slug}`, permanent });
    out.push({ source: '/trips', has: [{ type: 'query', key: 'sid', value: id }], destination: `/subjects/${slug}`, permanent });
  }
  for (const [id, slug] of Object.entries(map.countries)) {
    out.push({ source: `/trips&cid=${id}`, destination: `/countries/${slug}`, permanent });
    out.push({ source: '/trips', has: [{ type: 'query', key: 'cid', value: id }], destination: `/countries/${slug}`, permanent });
  }

  // Anything else in the old scheme lands on the trips index rather than a 404.
  out.push({ source: '/trips&:rest*', destination: '/trips', permanent });
  out.push({ source: '/trips', has: [{ type: 'query', key: 'id' }], destination: '/trips', permanent });
  out.push({ source: '/trips', has: [{ type: 'query', key: 'sid' }], destination: '/trips', permanent });
  out.push({ source: '/trips', has: [{ type: 'query', key: 'cid' }], destination: '/trips', permanent });

  // The old site's other pages.
  out.push({ source: '/index.php', destination: '/', permanent });
  out.push({ source: '/index.html', destination: '/', permanent });
  out.push({ source: '/about-us', destination: '/about', permanent });
  out.push({ source: '/contact-us', destination: '/', permanent });
  out.push({ source: '/contact', destination: '/', permanent });

  return out;
}
