import { Head } from '@inertiajs/react';

/**
 * MaintenancePage — Shown to public visitors when MAINTENANCE_MODE=true.
 * Internal tools (/admin /pos /staff /warehouse) are never redirected here.
 *
 * To enable:   set MAINTENANCE_MODE=true in .env, then php artisan config:cache
 * To disable:  set MAINTENANCE_MODE=false in .env, then php artisan config:cache
 */
export default function MaintenancePage() {
  return (
    <>
      <Head>
        <title>Coming Soon — Bellevue Gifts &amp; Supplies</title>
        <meta name="description" content="We're updating the Bellevue online store. Please check back soon." />
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <div className="min-h-screen flex flex-col items-center justify-center bg-[#00005D] px-6 text-white">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white/10 border border-white/20 mb-6 shadow-xl">
            <svg viewBox="0 0 40 40" className="w-12 h-12 fill-white" xmlns="http://www.w3.org/2000/svg">
              <rect x="4" y="4" width="32" height="32" rx="6" fillOpacity="0.15" />
              <path d="M10 20h20M20 10v20" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>

          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
            Bellevue Gifts &amp; Supplies
          </h1>
          <p className="text-white/60 text-sm uppercase tracking-widest font-medium">
            Freeport, Grand Bahama
          </p>
        </div>

        {/* Main message */}
        <div className="text-center max-w-lg mb-10">
          <div className="inline-flex items-center gap-2 bg-amber-400/20 border border-amber-400/30 rounded-full px-4 py-1.5 text-amber-300 text-xs font-semibold uppercase tracking-wider mb-6">
            <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></span>
            Scheduled Maintenance
          </div>

          <h2 className="text-2xl md:text-3xl font-bold mb-4 leading-tight">
            We're updating our online store.
          </h2>

          <p className="text-white/70 text-lg leading-relaxed">
            We'll be back shortly. Our team is working to bring you an even better
            shopping experience. Thank you for your patience.
          </p>
        </div>

        {/* Contact strip */}
        <div className="flex flex-col sm:flex-row gap-6 text-center sm:text-left text-white/70 text-sm border-t border-white/10 pt-8 w-full max-w-lg justify-center">
          <a
            href="tel:+12423525555"
            className="flex items-center justify-center gap-2 hover:text-white transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
            +1 (242) 352-5555
          </a>

          <a
            href="mailto:sales@bellevuegifts.com"
            className="flex items-center justify-center gap-2 hover:text-white transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="20" height="16" x="2" y="4" rx="2" />
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
            sales@bellevuegifts.com
          </a>
        </div>

        {/* Footer note */}
        <p className="mt-10 text-white/30 text-xs text-center">
          Are you staff?{' '}
          <a href="/staff/login" className="underline hover:text-white/60 transition-colors">
            Staff login
          </a>
          {' '}·{' '}
          <a href="/pos/login" className="underline hover:text-white/60 transition-colors">
            POS terminal
          </a>
        </p>
      </div>
    </>
  );
}
