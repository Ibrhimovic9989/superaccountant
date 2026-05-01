/**
 * Interactive smart-setup guides — chat/wizard style walkthroughs that
 * branch on user answers, embed videos, and track progress.
 *
 * Adding a guide:
 *   1. Create a new file under `tally/`, `zoho-books/`, or a new
 *      product family folder
 *   2. Export a `Guide` from it
 *   3. Import + add to GUIDES below
 *
 * Routing automatic — any new slug auto-lists at /[locale]/guides
 * and routes to /[locale]/guides/[slug].
 */

import { TALLY_BANKING } from './tally/banking'
import { TALLY_GETTING_STARTED } from './tally/getting-started'
import { TALLY_GST_RETURNS } from './tally/gst-returns'
import { TALLY_MASTERS } from './tally/masters'
import { TALLY_PURCHASE_VOUCHER } from './tally/purchase-voucher'
import { TALLY_REPORTS_BACKUP } from './tally/reports-and-backup'
import { TALLY_SALES_VOUCHER } from './tally/sales-voucher'
import { TALLY_TDS } from './tally/tds'

import { ZOHO_BANKING } from './zoho-books/banking'
import { ZOHO_EXPENSES } from './zoho-books/expenses'
import { ZOHO_GST_RETURNS } from './zoho-books/gst-returns'
import { ZOHO_GST_SETUP } from './zoho-books/gst-setup'
import { ZOHO_INVOICE } from './zoho-books/invoice'
import { ZOHO_RECURRING } from './zoho-books/recurring'
import { ZOHO_SIGNUP } from './zoho-books/signup'

import type { Guide, GuideStep } from './types'

export type { Guide, GuideStep } from './types'

export const GUIDES: Guide[] = [
  // Tally Prime — ordered as a learning path
  TALLY_GETTING_STARTED,
  TALLY_MASTERS,
  TALLY_SALES_VOUCHER,
  TALLY_PURCHASE_VOUCHER,
  TALLY_BANKING,
  TALLY_GST_RETURNS,
  TALLY_TDS,
  TALLY_REPORTS_BACKUP,

  // Zoho Books — same logical progression as Tally
  ZOHO_SIGNUP,
  ZOHO_GST_SETUP,
  ZOHO_INVOICE,
  ZOHO_EXPENSES,
  ZOHO_BANKING,
  ZOHO_RECURRING,
  ZOHO_GST_RETURNS,
]

export function getGuideBySlug(slug: string): Guide | undefined {
  return GUIDES.find((g) => g.slug === slug)
}

export function getGuidesForMarket(market: 'india' | 'ksa'): Guide[] {
  return GUIDES.filter((g) => g.market === market || g.market === 'both')
}

/** Group guides by family for the index page (Tally / Zoho / Other). */
export function groupGuidesByFamily(guides: Guide[]): Record<Guide['family'], Guide[]> {
  const grouped: Record<Guide['family'], Guide[]> = {
    'tally-prime': [],
    'zoho-books': [],
    other: [],
  }
  for (const g of guides) grouped[g.family].push(g)
  return grouped
}

/** Display name for a family. */
export const FAMILY_LABELS: Record<Guide['family'], { en: string; ar: string; emoji: string }> = {
  'tally-prime': { en: 'Tally Prime', ar: 'تالي برايم', emoji: '📒' },
  'zoho-books': { en: 'Zoho Books', ar: 'زوهو بوكس', emoji: '🌐' },
  other: { en: 'Other tools', ar: 'أدوات أخرى', emoji: '🛠️' },
}
