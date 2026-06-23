/**
 * Single source of truth for the Superaccountant brand assets in the
 * marketing app. Mirrors `apps/web/src/lib/brand.ts` — the same logo
 * file hosted on Supabase Storage so a swap is one constant change
 * across web + marketing.
 */

export const LOGO_URL =
  'https://nmiiqyfwvbcvtwumtwil.supabase.co/storage/v1/object/public/logo/WhatsApp_Image_2026-05-09_at_11.23.21-removebg-preview.png'

export const BRAND_NAME = 'Superaccountant'

/**
 * Founder portrait. Sourced from camuneer.com for now — if we ever
 * stop hot-linking, mirror the file into Supabase Storage and update
 * this constant. The /_next/image proxy URL serves a 640×640 webp,
 * which is the size we render at in the hero on lg screens.
 */
export const FOUNDER_PORTRAIT_URL =
  'https://www.camuneer.com/_next/image?url=%2Fportrait.jpg&w=640&q=75'

/** Founder bio data — single source so hero + about + FAQ stay in sync. */
export const FOUNDER = {
  fullName: 'CA Muneer Ahmed',
  shortName: 'CA Muneer',
  qualifier: 'FCA · ICAI',
  yearsPractising: 13,
  /** ₹ crore of audit work signed off across India / US / UAE / KSA. */
  auditTurnoverCr: 25_000,
  jurisdictions: 4,
  professionalsTrained: 120,
  companiesAdvised: 40,
  startupsGuided: 15,
  city: 'Hyderabad',
  /** Practice URL, used in the founder strip. */
  practiceUrl: 'https://www.camuneer.com',
} as const
