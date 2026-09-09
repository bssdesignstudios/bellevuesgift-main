import { useEffect, useState } from 'react';
import { Head } from '@inertiajs/react';
import bellevueLogo from '@/assets/bellevue-logo.webp';
import comingSoonBg from '@/assets/coming-soon-bg.webp';
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
 *    navy as the hero, so the indicator would be invisible there.
 *  - The hero photograph is decorative. Every text/background pair over it is
 *    measured against the SCRIMMED result, not the raw image — keep the scrim
 *    if you swap the picture.
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
/* Focus ring on the navy hero and footer. Mint is 16.30:1 on navy. */
const FOCUS_ON_NAVY =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-mint focus-visible:ring-offset-2 focus-visible:ring-offset-brand-blue';

const SHELL = 'mx-auto w-full max-w-3xl px-5 md:px-8 xl:max-w-6xl xl:px-10';

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
        {/* ── Hero ─────────────────────────────────────────────────────────
            Photograph sits behind a navy scrim plus a left-weighted gradient,
            so the headline column stays far above AA regardless of the image. */}
        <section className="relative isolate overflow-hidden bg-brand-blue">
          <img
            src={comingSoonBg}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 -z-20 h-full w-full object-cover object-right"
          />
          {/* Scrim. Mobile darkens top-down (text sits high); from md it darkens
              left-to-right so the photograph opens up beside the copy. Text only
              ever sits over the >=85% navy end, so contrast stays >12:1. */}
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10 bg-gradient-to-b from-brand-blue/95 via-brand-blue/90 to-brand-blue/65 md:bg-gradient-to-r md:from-brand-blue md:via-brand-blue/85 md:to-brand-blue/25"
          />

          {/* Hours strip */}
          <header className="border-b border-white/15">
            <div className={`${SHELL} flex flex-col gap-1 py-2.5 text-[13px] leading-snug text-white/85 md:flex-row md:items-center md:justify-between`}>
              <p>Mon–Fri 8:00 AM – 5:00 PM · Sat 9:00 AM – 3:00 PM · Sunday closed</p>
              <a
                href={TEL_HREF}
                className={`hidden transition-colors duration-150 motion-reduce:transition-none hover:text-white md:inline ${FOCUS_ON_NAVY}`}
              >
                <span className="sr-only">Call </span>
                {STORE_INFO.phone}
              </a>
            </div>
          </header>

          <div className={`${SHELL} pb-14 pt-10 md:pb-20 md:pt-14`}>
            <img
              src={bellevueLogo}
              alt="Bellevue Gifts &amp; Supplies Ltd."
              width={156}
              height={44}
              className="h-9 w-auto object-contain brightness-0 invert md:h-11"
            />

            <div
              className={`motion-safe:transition-all motion-safe:duration-[240ms] motion-safe:ease-out ${
                mounted ? 'opacity-100' : 'motion-safe:translate-y-0.5 motion-safe:opacity-0'
              }`}
            >
              <h1 className="mt-8 text-balance text-[2rem] font-bold leading-[1.05] tracking-[-0.02em] text-white md:max-w-[17ch] md:text-[2.75rem] xl:max-w-[16ch] xl:text-[3.25rem] xl:leading-[1.02]">
                The store is open.
                <br />
                The website is what&rsquo;s coming.
              </h1>
              <p className="mt-4 max-w-[34ch] text-[17px] leading-[1.55] text-white/85 md:max-w-[46ch]">
                We&rsquo;ve supplied Freeport&rsquo;s schools, offices and homes for over twenty
                years, and our doors are open today. Online ordering is the part we&rsquo;re still
                building.
              </p>
            </div>

            <div className="mt-8 flex flex-col gap-3 md:flex-row">
              <a
                href={TEL_HREF}
                className={`inline-flex h-12 w-full items-center justify-center rounded-md bg-white font-medium text-brand-blue transition-colors duration-150 motion-reduce:transition-none hover:bg-brand-mint md:w-auto md:px-7 ${FOCUS_ON_NAVY}`}
              >
                <span className="sr-only">Call </span>
                {STORE_INFO.phone}
              </a>
              <a
                href={`mailto:${STORE_INFO.email}`}
                className={`inline-flex h-12 w-full items-center justify-center rounded-md border border-white/60 font-medium text-white transition-colors duration-150 motion-reduce:transition-none hover:border-white hover:bg-white/10 md:w-auto md:px-7 ${FOCUS_ON_NAVY}`}
              >
                <span className="sr-only">Email </span>
                {STORE_INFO.email}
              </a>
            </div>
          </div>
        </section>

        <main>
          {/* Trading board */}
          <div className={`${SHELL} py-2`}>
            <dl className="md:grid md:grid-cols-2 md:gap-x-12">
              <div className="border-b border-slate-200 py-5 md:border-b-0 md:border-t">
                <dt className="text-[12px] uppercase tracking-[0.08em] text-slate-600">Hours</dt>
                <dd className="mt-2 max-w-[260px] space-y-1 text-[16px] text-brand-blue">
                  {HOURS.map((row) => (
                    <div key={row.days} className="flex justify-between tabular-nums">
                      <span>{row.days}</span>
                      <span>{row.time}</span>
                    </div>
                  ))}
                </dd>
              </div>

              <div className="border-b border-slate-200 py-5 md:border-b-0 md:border-t">
                <dt className="text-[12px] uppercase tracking-[0.08em] text-slate-600">Find us</dt>
                <dd className="mt-2 text-[16px] text-brand-blue">{STORE_INFO.address}</dd>
              </div>

              <div className="border-b border-slate-200 py-5 md:border-t">
                <dt className="text-[12px] uppercase tracking-[0.08em] text-slate-600">Call</dt>
                <dd>
                  <a
                    href={TEL_HREF}
                    className={`mt-1 inline-flex min-h-11 items-center text-[16px] text-brand-blue underline-offset-4 transition-colors duration-150 motion-reduce:transition-none hover:underline ${FOCUS_LIGHT}`}
                  >
                    <span className="sr-only">Call </span>
                    {STORE_INFO.phone}
                  </a>
                </dd>
              </div>

              <div className="border-b border-slate-200 py-5 md:border-t">
                <dt className="text-[12px] uppercase tracking-[0.08em] text-slate-600">Email</dt>
                <dd>
                  <a
                    href={`mailto:${STORE_INFO.email}`}
                    className={`mt-1 inline-flex min-h-11 items-center text-[16px] text-brand-blue underline-offset-4 transition-colors duration-150 motion-reduce:transition-none hover:underline ${FOCUS_LIGHT}`}
                  >
                    <span className="sr-only">Email </span>
                    {STORE_INFO.email}
                  </a>
                </dd>
              </div>
            </dl>
          </div>

          {/* Departments */}
          <section className="mt-6 bg-brand-mint py-9">
            <div className={SHELL}>
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
          <div className={`${SHELL} py-10`}>
            <p className="max-w-[46ch] text-[16px] leading-[1.6] text-slate-600">
              When the online store opens you&rsquo;ll be able to order for pickup or shipping.
              Until then, the fastest way to get what you need is to call — we&rsquo;ll tell you
              straight away whether it&rsquo;s in stock.
            </p>
          </div>
        </main>

        <footer className="bg-brand-blue py-8 text-[13px] text-white">
          <div className={`${SHELL} md:flex md:items-center md:justify-between`}>
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
