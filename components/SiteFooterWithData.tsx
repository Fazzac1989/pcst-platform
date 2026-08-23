import Image from 'next/image';
import Link from 'next/link';
import { getAllSubjects, getCities, getCountries } from '@/lib/data';

/**
 * The footer, carrying the whole site map.
 *
 * Every subject, country and city has its own page, and until now most of
 * them were reachable only through the header menus — which meant a search
 * engine following links found them slowly, and a reader who had scrolled to
 * the bottom of a trip had nowhere obvious to go next. Listing them here puts
 * every page one click from every other page.
 */
export default async function SiteFooterWithData() {
  const [subjects, countries, cities] = await Promise.all([
    getAllSubjects(),
    getCountries(),
    getCities(),
  ]);

  const map: { title: string; links: { href: string; label: string }[] }[] = [
    {
      title: 'Subjects',
      links: subjects.map((s) => ({ href: `/subjects/${s.slug}`, label: s.name })),
    },
    {
      title: 'Destinations',
      links: countries.map((c) => ({ href: `/countries/${c.slug}`, label: c.name })),
    },
    {
      title: 'Cities',
      links: cities.map((c) => ({ href: `/cities/${c.slug}`, label: c.name })),
    },
  ].filter((g) => g.links.length > 0);

  return (
    <footer className="site">
      <div className="wrap">
        <div className="top">
          <div className="brand">
            <Link className="logo" href="/">
              <Image
                src="/images/logo-footer.png"
                alt="Premium Choice School Trips"
                width={610}
                height={150}
                style={{ width: '100%', maxWidth: 430, height: 'auto', marginLeft: -16 }}
              />
            </Link>
            <p>
              Educational travel designed, priced and supported from Dubai — for schools across the
              UAE and beyond.
            </p>
          </div>
          <div>
            <h5>Explore</h5>
            <ul>
              <li><Link href="/trips">All trips</Link></li>
              <li><a href="/#subjects">Browse by subject</a></li>
              <li><a href="/#trips">Journey inspiration</a></li>
              <li><Link href="/our-app">Your travel companion</Link></li>
            </ul>
          </div>
          <div>
            <h5>For you</h5>
            <ul>
              <li><Link href="/for-teachers">For teachers</Link></li>
              <li><Link href="/for-parents">For parents</Link></li>
              <li><Link href="/for-school-leaders">For school leaders</Link></li>
              <li><Link href="/why-premium-choice">Why Premium Choice</Link></li>
            </ul>
          </div>
          <div>
            <h5>Company</h5>
            <ul>
              <li><Link href="/safety">Safety &amp; Safeguarding</Link></li>
              <li><Link href="/about">Our story</Link></li>
              <li><a href="/#contact">Contact us</a></li>
            </ul>
          </div>
          <div>
            <h5>Contact</h5>
            <ul>
              <li><a href="tel:+97144206965">+971 4 420 6965</a></li>
              <li><a href="mailto:info@premiumchoicetravel.com">info@premiumchoicetravel.com</a></li>
              <li>Dubai, United Arab Emirates</li>
            </ul>
          </div>
        </div>

        <nav className="sitemap" aria-label="Site map">
          {map.map((group) => (
            <div className="sitemap-group" key={group.title}>
              <h5>
                {group.title} <span>{group.links.length}</span>
              </h5>
              <div className="sitemap-links">
                {group.links.map((l) => (
                  <Link href={l.href} key={l.href}>
                    {l.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="bottom">
          <span>© Premium Choice Travel. All rights reserved.</span>
          <span>Privacy · Terms · Cookies</span>
        </div>
      </div>
    </footer>
  );
}
