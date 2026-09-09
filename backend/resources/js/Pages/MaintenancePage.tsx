import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { Head } from '@inertiajs/react';
import bellevueLogo from '@/assets/bellevue-logo.webp';
import comingSoonBg from '@/assets/coming-soon-bg.webp';
import { STORE_INFO } from '@/lib/constants';

/**
 * MaintenancePage — served with a 503 to public visitors on bellevuegifts.com
 * while the online store is being built. The Freeport store is open and
 * trading, so this page's job is to get a stranger to phone it.
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
 *  - CONTRAST, measured against the COMPOSITED result, not the raw image:
 *      desktop — the copy sits over the picture's near-black left side
 *        (brightest pixel rgb(41,50,67)), 12.87:1 for white before any overlay.
 *      mobile  — the portrait crop puts the brass ruler behind the body copy,
 *        so the overlay runs /95 → /85 → /60 top-to-bottom: white 11.5:1 and
 *        white/70 body 7.3:1 over the brightest pixel in that crop.
 *    Do not lighten the mobile mid-stop past /80 (body drops to 4.89:1, which
 *    only just clears AA). Re-measure if you swap the picture.
 */

const HOURS = [
  { days: 'Mon – Fri', time: '8:00 AM – 5:00 PM' },
  { days: 'Saturday', time: '9:00 AM – 3:00 PM' },
  { days: 'Sunday', time: 'Closed' },
];

const TEL_HREF = 'tel:+12423525555';

const FOCUS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-mint focus-visible:ring-offset-2 focus-visible:ring-offset-brand-blue';

const LABEL = 'text-[11px] uppercase tracking-[0.16em] text-white/45';

export default function MaintenancePage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  /** Staggered entrance — index 0 leads, each step 70ms behind. */
  const rise = (step: number) =>
    `motion-safe:transition-all motion-safe:duration-700 motion-safe:ease-out ${
      mounted ? 'translate-y-0 opacity-100' : 'motion-safe:translate-y-2 motion-safe:opacity-0'
    } motion-safe:[transition-delay:var(--d)]`;

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

      <div className="relative isolate flex min-h-dvh flex-col overflow-hidden bg-[#050A1A]">
        {/* One background, full page. */}
        <img
          src={comingSoonBg}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 -z-20 h-full w-full object-cover object-right md:object-center"
        />
        {/* Atmosphere: darkens the copy side, leaves the brass highlight alone. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-gradient-to-b from-[#050A1A]/95 via-[#050A1A]/85 to-[#050A1A]/60 md:bg-gradient-to-r md:from-[#050A1A]/95 md:via-[#050A1A]/70 md:to-transparent"
        />

        <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 md:px-10">
          {/* Header */}
          <header
            style={{ '--d': '0ms' } as CSSProperties}
            className={`flex items-center justify-between gap-6 border-b border-white/10 py-6 md:py-7 ${rise(0)}`}
          >
            <img
              src={bellevueLogo}
              alt="Bellevue Gifts &amp; Supplies Ltd."
              width={156}
              height={44}
              className="h-8 w-auto object-contain brightness-0 invert md:h-9"
            />
            <a
              href={TEL_HREF}
              className={`shrink-0 text-[13px] text-white/70 transition-colors duration-200 motion-reduce:transition-none hover:text-white sm:text-[14px] ${FOCUS}`}
            >
              <span className="sr-only">Call </span>
              {STORE_INFO.phone}
            </a>
          </header>

          {/* Statement */}
          <main className="flex flex-1 flex-col justify-center py-12 md:max-w-[64%] md:py-16 lg:max-w-[60%]">
            <p
              style={{ '--d': '70ms' } as CSSProperties}
              className={`${LABEL} ${rise(1)}`}
            >
              Freeport, Grand Bahama
            </p>

            <h1
              style={{ '--d': '140ms' } as CSSProperties}
              className={`mt-5 font-display text-[2.75rem] font-normal leading-[1.08] tracking-[-0.01em] text-white md:text-[2.9rem] md:leading-[1.08] lg:text-[3.35rem] lg:leading-[1.06] ${rise(2)}`}
            >
              The store is open.
              <br />
              The website is what&rsquo;s coming.
            </h1>

            <p
              style={{ '--d': '210ms' } as CSSProperties}
              className={`mt-6 max-w-[52ch] text-[17px] leading-[1.65] text-white/70 md:text-[18px] ${rise(3)}`}
            >
              We&rsquo;ve supplied Freeport&rsquo;s schools, offices and homes for over twenty
              years, and our doors are open today. Online ordering is the part we&rsquo;re still
              building — until then, call and we&rsquo;ll tell you straight away whether it&rsquo;s
              in stock.
            </p>

            <div
              style={{ '--d': '280ms' } as CSSProperties}
              className={`mt-9 flex flex-col gap-3 sm:flex-row sm:items-center ${rise(4)}`}
            >
              <a
                href={TEL_HREF}
                className={`group inline-flex h-[3.25rem] w-full items-center justify-center rounded-full bg-white px-8 text-[15px] font-medium text-[#050A1A] transition-all duration-200 motion-reduce:transition-none hover:bg-brand-mint hover:shadow-[0_0_40px_-8px_rgba(225,248,239,0.5)] sm:w-auto ${FOCUS}`}
              >
                Call the store
                <span className="ml-2 text-[#050A1A]/60 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none">
                  &rarr;
                </span>
              </a>
              <a
                href={`mailto:${STORE_INFO.email}`}
                className={`inline-flex h-[3.25rem] w-full items-center justify-center rounded-full border border-white/25 px-8 text-[15px] text-white/85 transition-colors duration-200 motion-reduce:transition-none hover:border-white/60 hover:text-white sm:w-auto ${FOCUS}`}
              >
                {STORE_INFO.email}
              </a>
            </div>

            <dl
              style={{ '--d': '350ms' } as CSSProperties}
              className={`mt-12 grid gap-8 border-t border-white/10 pt-8 text-[15px] text-white/75 sm:grid-cols-2 ${rise(5)}`}
            >
              <div>
                <dt className={LABEL}>Opening hours</dt>
                <dd className="mt-3 max-w-[250px] space-y-1.5">
                  {HOURS.map((row) => (
                    <div key={row.days} className="flex justify-between gap-6 tabular-nums">
                      <span>{row.days}</span>
                      <span className="text-white/60">{row.time}</span>
                    </div>
                  ))}
                </dd>
              </div>
              <div>
                <dt className={LABEL}>Find us</dt>
                <dd className="mt-3">{STORE_INFO.address}</dd>
              </div>
            </dl>
          </main>

          {/* Footer */}
          <footer className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-white/10 py-6 text-[12px] text-white/40">
            <p>
              &copy; {new Date().getFullYear()} {STORE_INFO.name}
            </p>
            <a
              href="/pos/login"
              className={`inline-flex min-h-11 items-center transition-colors duration-200 motion-reduce:transition-none hover:text-white/80 ${FOCUS}`}
            >
              Staff sign in
            </a>
          </footer>
        </div>
      </div>
    </>
  );
}
