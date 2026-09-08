import { useEffect, useState } from 'react';
import { Head } from '@inertiajs/react';
import bellevueLogo from '@/assets/bellevue-logo.webp';
import { STORE_INFO } from '@/lib/constants';

/**
 * MaintenancePage — served with a 503 to public visitors on bellevuegifts.com
 * while the online store is being built. The Freeport store is open and
 * trading, so this page's job is to hand a stranger the phone number, the
 * email address and the opening hours — not to apologise for a missing website.
 *
 * Toggle: Admin → Settings → "Coming Soon Page".
 * State lives in store_settings (see App\Models\StoreSetting::MAINTENANCE_KEY).
 *
 * IMPLEMENTATION NOTES — read before editing:
 *  - StorefrontMaintenance is PREPENDED middleware that returns without calling
 *    $next, so HandleInertiaRequests never runs. There are NO shared Inertia
 *    props here. Do not read usePage().props.
 *  - Do not wrap this in StorefrontLayout: its header and footer link to /shop,
 *    /cart and /track-order, every one of which 503s behind this middleware.
 *  - The only reachable internal link is /pos/login ('/pos' is in the
 *    middleware's BYPASS_PREFIXES).
 *  - Focus rings must NOT use ring-ring: --color-ring is #00005D, the same
 *    navy as the bands, so the indicator would be invisible.
 */

const DEPARTMENTS = [
  'Art & Craft Supplies',
  'Bags & Backpacks',
  'Books & Reading',
  'Cleaning Supplies',
  'Computers & Accessories',
  'Electronics & Audio Visual',
  'Home Décor',
  'Musical Instruments',
  'Office Supplies',
  'Party Supplies',
  'School Supplies',
  'Toys, Games & Bikes',
];

const HOURS = [
  { days: 'Mon – Fri', time: '8:00 AM – 5:00 PM' },
  { days: 'Saturday', time: '9:00 AM – 3:00 PM' },
  { days: 'Sunday', time: 'Closed' },
];

const TEL_HREF = 'tel:+12423525555';

/* Focus ring on light grounds (white, mint). Navy is 18.13:1 on white. */
const FOCUS_LIGHT =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2 focus-visible:ring-offset-background';
/* Focus ring inside the navy bands. Mint is 16.30:1 on navy. */
const FOCUS_ON_NAVY =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-mint focus-visible:ring-offset-2 focus-visible:ring-offset-brand-blue';

export default function MaintenancePage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  return (
    <>
      <Head>
        <title>Bellevue Gifts &amp; Supplies — Freeport, Grand Bahama</title>
        <meta
          name="description"
          content="Bellevue Gifts &amp; Supplies Ltd. in Freeport, Grand Bahama. Our store is open Monday to Saturday; our online store is still being built. Call +1 (242) 352-5555."
        />
        <link rel="canonical" href="https://bellevuegifts.com/" />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Bellevue Gifts &amp; Supplies" />
        <meta property="og:title" content="Bellevue Gifts &amp; Supplies — Freeport, Grand Bahama" />
        <meta property="og:description" content="The store is open. The website is what's coming." />
        <meta property="og:url" content="https://bellevuegifts.com/" />
      </Head>

      <div className="min-h-dvh bg-background">
        {/* Hours band */}
        <header className="bg-brand-blue px-5 py-2.5 text-[13px] leading-snug text-white">
          <div className="md:mx-auto md:flex md:max-w-3xl md:items-center md:justify-between md:px-8 xl:max-w-6xl xl:px-4">
            <p className="text-center md:text-left">
              Mon–Fri 8:00 AM – 5:00 PM · Sat 9:00 AM – 3:00 PM · Sunday closed
            </p>
            <a
              href={TEL_HREF}
              className={`mt-1 hidden transition-colors duration-150 motion-reduce:transition-none hover:text-brand-mint md:mt-0 md:inline ${FOCUS_ON_NAVY}`}
            >
              <span className="sr-only">Call </span>
              {STORE_INFO.phone}
            </a>
          </div>
        </header>

        <main>
          <div className="md:mx-auto md:max-w-3xl md:px-8 xl:grid xl:max-w-6xl xl:grid-cols-12 xl:gap-x-16 xl:px-4">
            <div className="xl:col-span-7">
              {/* Masthead */}
              <div className="px-5 pt-8 md:px-0">
                <img
                  src={bellevueLogo}
                  alt="Bellevue Gifts &amp; Supplies Ltd."
                  width={156}
                  height={44}
                  className="h-9 w-auto object-contain"
                />
                <div className="mt-6 border-b border-slate-200" />
              </div>

              {/* Statement */}
              <div
                className={`px-5 pt-8 md:px-0 motion-safe:transition-all motion-safe:duration-[240ms] motion-safe:ease-out ${
                  mounted ? 'opacity-100 md:translate-y-0' : 'motion-safe:translate-y-0.5 motion-safe:opacity-0'
                }`}
              >
                <h1 className="text-balance text-[2rem] font-bold leading-[1.05] tracking-[-0.02em] text-brand-blue md:max-w-[17ch] md:text-[2.75rem] xl:max-w-[16ch] xl:text-[3.25rem] xl:leading-[1.02]">
                  The store is open.
                  <br />
                  The website is what&rsquo;s coming.
                </h1>
                <p className="mt-4 max-w-[34ch] text-[17px] leading-[1.55] text-slate-600">
                  We&rsquo;ve supplied Freeport&rsquo;s schools, offices and homes for over twenty
                  years, and our doors are open today. Online ordering is the part we&rsquo;re still
                  building.
                </p>
              </div>

              {/* Actions */}
              <div className="mt-7 flex flex-col gap-3 px-5 md:flex-row md:px-0">
                <a
                  href={TEL_HREF}
                  className={`inline-flex h-12 w-full items-center justify-center rounded-md bg-brand-blue font-medium text-white transition-colors duration-150 motion-reduce:transition-none hover:bg-brand-blue/90 md:w-auto md:px-6 ${FOCUS_LIGHT}`}
                >
                  <span className="sr-only">Call </span>
                  {STORE_INFO.phone}
                </a>
                <a
                  href={`mailto:${STORE_INFO.email}`}
                  className={`inline-flex h-12 w-full items-center justify-center rounded-md border border-brand-blue font-medium text-brand-blue transition-colors duration-150 motion-reduce:transition-none hover:bg-brand-mint md:w-auto md:px-6 ${FOCUS_LIGHT}`}
                >
                  <span className="sr-only">Email </span>
                  {STORE_INFO.email}
                </a>
              </div>
            </div>

            {/* Trading board */}
            <div className="xl:col-span-5 xl:border-l xl:border-slate-200 xl:pl-16">
              <dl className="mt-10 px-5 md:grid md:grid-cols-[120px_1fr] md:gap-x-6 md:px-0 xl:mt-8">
                <div className="contents">
                  <dt className="border-t border-slate-200 pt-4 text-[12px] uppercase tracking-[0.08em] text-slate-600 md:pt-[0.9rem]">
                    Hours
                  </dt>
                  <dd className="border-slate-200 pb-4 md:border-t md:pt-3.5">
                    <div className="mt-1.5 max-w-[240px] space-y-1 text-[16px] text-brand-blue md:mt-0">
                      {HOURS.map((row) => (
                        <div key={row.days} className="flex justify-between tabular-nums">
                          <span>{row.days}</span>
                          <span>{row.time}</span>
                        </div>
                      ))}
                    </div>
                  </dd>
                </div>

                <div className="contents">
                  <dt className="border-t border-slate-200 pt-4 text-[12px] uppercase tracking-[0.08em] text-slate-600 md:pt-[0.9rem]">
                    Call
                  </dt>
                  <dd className="border-slate-200 pb-4 md:border-t md:pt-3">
                    <a
                      href={TEL_HREF}
                      className={`mt-1.5 inline-flex min-h-11 items-center text-[16px] text-brand-blue underline-offset-4 transition-colors duration-150 motion-reduce:transition-none hover:underline md:mt-0 ${FOCUS_LIGHT}`}
                    >
                      <span className="sr-only">Call </span>
                      {STORE_INFO.phone}
                    </a>
                  </dd>
                </div>

                <div className="contents">
                  <dt className="border-t border-slate-200 pt-4 text-[12px] uppercase tracking-[0.08em] text-slate-600 md:pt-[0.9rem]">
                    Email
                  </dt>
                  <dd className="border-slate-200 pb-4 md:border-t md:pt-3">
                    <a
                      href={`mailto:${STORE_INFO.email}`}
                      className={`mt-1.5 inline-flex min-h-11 items-center text-[16px] text-brand-blue underline-offset-4 transition-colors duration-150 motion-reduce:transition-none hover:underline md:mt-0 ${FOCUS_LIGHT}`}
                    >
                      <span className="sr-only">Email </span>
                      {STORE_INFO.email}
                    </a>
                  </dd>
                </div>

                <div className="contents">
                  <dt className="border-t border-slate-200 pt-4 text-[12px] uppercase tracking-[0.08em] text-slate-600 md:pt-[0.9rem]">
                    Find us
                  </dt>
                  <dd className="border-slate-200 pb-4 md:border-t md:pt-3.5">
                    <p className="mt-1.5 text-[16px] text-brand-blue md:mt-0">{STORE_INFO.address}</p>
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Departments */}
          <section className="mt-12 bg-brand-mint px-5 py-9">
            <div className="md:mx-auto md:max-w-3xl md:px-8 xl:max-w-6xl xl:px-4">
              <h2 className="text-[13px] font-semibold uppercase tracking-[0.16em] text-brand-blue">
                Some of what we carry
              </h2>
              <div className="mt-4 border-t border-brand-blue/15" />
              <ul className="md:columns-2 md:gap-x-12 xl:columns-3 xl:gap-x-16">
                {DEPARTMENTS.map((name, i) => (
                  <li
                    key={name}
                    className={`border-b border-brand-blue/15 py-2.5 text-[16px] text-brand-blue ${
                      i === DEPARTMENTS.length - 1 ? 'border-b-0' : ''
                    }`}
                  >
                    {name}
                  </li>
                ))}
              </ul>
              <p className="mt-6 max-w-[42ch] text-[15px] text-brand-blue/80">
                We also handle repairs and gift cards, and we take bulk orders for schools and
                businesses.
              </p>
            </div>
          </section>

          {/* Closing */}
          <div className="px-5 py-10">
            <p className="max-w-[42ch] text-[16px] leading-[1.6] text-slate-600 md:mx-auto md:max-w-3xl md:px-8 xl:max-w-6xl xl:px-4">
              When the online store opens you&rsquo;ll be able to order for pickup or shipping.
              Until then, the fastest way to get what you need is to call — we&rsquo;ll tell you
              straight away whether it&rsquo;s in stock.
            </p>
          </div>
        </main>

        <footer className="bg-brand-blue px-5 py-8 text-[13px] text-white">
          <div className="md:mx-auto md:flex md:max-w-3xl md:items-center md:justify-between md:px-8 xl:max-w-6xl xl:px-4">
            <p>
              &copy; {new Date().getFullYear()} {STORE_INFO.name}
            </p>
            <a
              href="/pos/login"
              className={`mt-3 inline-flex min-h-11 items-center text-white/70 transition-colors duration-150 motion-reduce:transition-none hover:text-white md:mt-0 ${FOCUS_ON_NAVY}`}
            >
              Staff sign in
            </a>
          </div>
        </footer>
      </div>
    </>
  );
}
