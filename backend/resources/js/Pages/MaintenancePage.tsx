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
 * ONE background, one screen. Do not reintroduce banded sections.
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
 *    navy as the ground, so the indicator would be invisible.
 *  - The photograph is decorative and sits under a flat navy scrim. Text is
 *    measured against the COMPOSITED result, using the brightest pixel of the
 *    visible crop: white 8.35:1 and white/85 body 6.56:1 at this scrim. Do not
 *    lighten it past /70, and re-measure if you swap the picture.
 */

const HOURS = [
  { days: 'Mon – Fri', time: '8:00 AM – 5:00 PM' },
  { days: 'Saturday', time: '9:00 AM – 3:00 PM' },
  { days: 'Sunday', time: 'Closed' },
];

const TEL_HREF = 'tel:+12423525555';

const FOCUS =
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

      <div className="relative isolate flex min-h-dvh flex-col bg-brand-blue">
        {/* One background, full page. */}
        <img
          src={comingSoonBg}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 -z-20 h-full w-full object-cover object-right md:object-center"
        />
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-brand-blue/[0.72]" />

        <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-6 py-14 md:px-8 md:py-20">
          <img
            src={bellevueLogo}
            alt="Bellevue Gifts &amp; Supplies Ltd."
            width={156}
            height={44}
            className="h-10 w-auto object-contain brightness-0 invert md:h-12"
          />

          <div
            className={`motion-safe:transition-all motion-safe:duration-[240ms] motion-safe:ease-out ${
              mounted ? 'opacity-100' : 'motion-safe:translate-y-0.5 motion-safe:opacity-0'
            }`}
          >
            <h1 className="mt-9 text-balance text-[2rem] font-bold leading-[1.05] tracking-[-0.02em] text-white md:text-[3rem] md:leading-[1.03]">
              The store is open.
              <br />
              The website is what&rsquo;s coming.
            </h1>
            <p className="mt-5 max-w-[46ch] text-[17px] leading-[1.55] text-white/85 md:text-[18px]">
              We&rsquo;ve supplied Freeport&rsquo;s schools, offices and homes for over twenty
              years, and our doors are open today. Online ordering is the part we&rsquo;re still
              building — until then, call and we&rsquo;ll tell you straight away whether it&rsquo;s
              in stock.
            </p>
          </div>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <a
              href={TEL_HREF}
              className={`inline-flex h-12 w-full items-center justify-center rounded-md bg-white font-medium text-brand-blue transition-colors duration-150 motion-reduce:transition-none hover:bg-brand-mint sm:w-auto sm:px-7 ${FOCUS}`}
            >
              <span className="sr-only">Call </span>
              {STORE_INFO.phone}
            </a>
            <a
              href={`mailto:${STORE_INFO.email}`}
              className={`inline-flex h-12 w-full items-center justify-center rounded-md border border-white/60 font-medium text-white transition-colors duration-150 motion-reduce:transition-none hover:border-white hover:bg-white/10 sm:w-auto sm:px-7 ${FOCUS}`}
            >
              <span className="sr-only">Email </span>
              {STORE_INFO.email}
            </a>
          </div>

          <dl className="mt-11 border-t border-white/20 pt-6 text-[15px] text-white/85 sm:flex sm:gap-12">
            <div>
              <dt className="text-[12px] uppercase tracking-[0.08em] text-white/60">
                Opening hours
              </dt>
              <dd className="mt-2 max-w-[240px] space-y-1">
                {HOURS.map((row) => (
                  <div key={row.days} className="flex justify-between gap-6 tabular-nums">
                    <span>{row.days}</span>
                    <span>{row.time}</span>
                  </div>
                ))}
              </dd>
            </div>
            <div className="mt-6 sm:mt-0">
              <dt className="text-[12px] uppercase tracking-[0.08em] text-white/60">Find us</dt>
              <dd className="mt-2">{STORE_INFO.address}</dd>
            </div>
          </dl>
        </main>

        <footer className="mx-auto w-full max-w-2xl px-6 pb-8 text-[13px] text-white/60 md:px-8">
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
            <p>
              &copy; {new Date().getFullYear()} {STORE_INFO.name}
            </p>
            <a
              href="/pos/login"
              className={`inline-flex min-h-11 items-center transition-colors duration-150 motion-reduce:transition-none hover:text-white ${FOCUS}`}
            >
              Staff sign in
            </a>
          </div>
        </footer>
      </div>
    </>
  );
}
