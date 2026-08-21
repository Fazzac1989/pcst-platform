import Image from 'next/image';
import Link from 'next/link';

export function SiteFooterFull() {
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
              Educational travel designed, priced and supported from Dubai — for schools across
              the UAE and beyond.
            </p>
          </div>
          <div>
            <h5>Explore</h5>
            <ul>
              <li><a href="/#subjects">Subjects</a></li>
              <li><a href="/#journey">With you at every stage</a></li>
              <li><Link href="/trips">All trips</Link></li>
              <li><a href="#">Blog</a></li>
            </ul>
          </div>
          <div>
            <h5>Company</h5>
            <ul>
              <li><Link href="/safety">Health, Safety &amp; Security</Link></li>
              <li><a href="#">About us</a></li>
              <li><a href="#">Terms &amp; Conditions</a></li>
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
        <div className="bottom">
          <span>© Premium Choice Travel. All rights reserved.</span>
          <span>Privacy · Terms · Cookies</span>
        </div>
      </div>
    </footer>
  );
}

export function SiteFooterSimple() {
  return (
    <footer className="simple">
      <div className="wrap">
        <Image
          src="/images/logo-footer.png"
          alt="Premium Choice School Trips"
          width={610}
          height={150}
          style={{ width: 300, maxWidth: '70vw', height: 'auto', marginLeft: -10 }}
        />
        <div style={{ textAlign: 'right' }}>
          <div>
            <a href="tel:+97144206965">+971 4 420 6965</a> ·{' '}
            <a href="mailto:info@premiumchoicetravel.com">info@premiumchoicetravel.com</a>
          </div>
          <div className="fine">© Premium Choice Travel · Dubai, United Arab Emirates</div>
        </div>
      </div>
    </footer>
  );
}
