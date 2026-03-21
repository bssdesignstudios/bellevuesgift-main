import { Head } from '@inertiajs/react';

const SITE_NAME = 'Bellevue Gifts & Supplies';
const BASE_URL  = 'https://bellevue.gifts';
/** Absolute fallback OG image served from /public */
const DEFAULT_OG_IMAGE = `${BASE_URL}/og-default.jpg`;

interface PageMetaProps {
  /** Page-level title (no site name suffix needed — it's appended automatically) */
  title: string;
  /** Plain-text description for meta description and OG (150–160 chars ideal) */
  description?: string;
  /** OG title override — defaults to the full composed title */
  ogTitle?: string;
  /** OG description override — defaults to description */
  ogDescription?: string;
  /** Absolute URL for OG image — defaults to DEFAULT_OG_IMAGE */
  ogImage?: string;
  /** OG type — 'website' for most pages, 'product' for product pages */
  ogType?: 'website' | 'product' | 'article';
  /** Canonical URL — defaults to current page URL via window.location */
  canonical?: string;
  /** Set true for cart / checkout / admin / account pages (no-index) */
  noIndex?: boolean;
}

/**
 * PageMeta — drop-in Inertia Head block for every storefront page.
 *
 * Usage:
 *   <PageMeta
 *     title="Shop All Products"
 *     description="Browse 5,000+ office, school and gift supplies."
 *   />
 *
 * The full <title> rendered will be:
 *   "Shop All Products — Bellevue Gifts & Supplies"
 *
 * Never renders a bare "Bellevue Gifts & Supplies" title — always page-specific.
 */
export function PageMeta({
  title,
  description,
  ogTitle,
  ogDescription,
  ogImage,
  ogType = 'website',
  canonical,
  noIndex = false,
}: PageMetaProps) {
  // Compose full title — avoid double site-name if caller already included it
  const fullTitle = title.includes(SITE_NAME)
    ? title
    : `${title} — ${SITE_NAME}`;

  const resolvedOgTitle       = ogTitle       || fullTitle;
  const resolvedOgDescription = ogDescription || description || '';
  const resolvedOgImage       = ogImage       || DEFAULT_OG_IMAGE;

  return (
    <Head>
      <title>{fullTitle}</title>

      {description && (
        <meta head-key="description" name="description" content={description} />
      )}

      {noIndex && (
        <meta head-key="robots" name="robots" content="noindex, nofollow" />
      )}

      {canonical && (
        <link head-key="canonical" rel="canonical" href={canonical} />
      )}

      {/* Open Graph */}
      <meta head-key="og:type"        property="og:type"        content={ogType} />
      <meta head-key="og:site_name"   property="og:site_name"   content={SITE_NAME} />
      <meta head-key="og:title"       property="og:title"       content={resolvedOgTitle} />
      {resolvedOgDescription && (
        <meta head-key="og:description" property="og:description" content={resolvedOgDescription} />
      )}
      <meta head-key="og:image"       property="og:image"       content={resolvedOgImage} />

      {/* Twitter / X card */}
      <meta head-key="twitter:card"        name="twitter:card"        content="summary_large_image" />
      <meta head-key="twitter:title"       name="twitter:title"       content={resolvedOgTitle} />
      {resolvedOgDescription && (
        <meta head-key="twitter:description" name="twitter:description" content={resolvedOgDescription} />
      )}
      <meta head-key="twitter:image"       name="twitter:image"       content={resolvedOgImage} />
    </Head>
  );
}
