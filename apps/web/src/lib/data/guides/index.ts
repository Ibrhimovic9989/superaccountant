/**
 * Interactive smart-setup guides — chat/wizard style walkthroughs that
 * branch on user answers, embed videos, and track progress.
 *
 * Adding a guide:
 *   1. Create a new file under `tally/`, `zoho-books/`, `quickbooks/`,
 *      or a new product family folder
 *   2. Export a `Guide` from it
 *   3. Import + add to GUIDES below
 *
 * Routing automatic — any new slug auto-lists at /[locale]/guides
 * and routes to /[locale]/guides/[slug].
 */

import { TALLY_BANKING } from './tally/banking'
import { TALLY_COST_CENTRES } from './tally/cost-centres'
import { TALLY_GETTING_STARTED } from './tally/getting-started'
import { TALLY_GST_RETURNS } from './tally/gst-returns'
import { TALLY_INVENTORY } from './tally/inventory'
import { TALLY_MASTERS } from './tally/masters'
import { TALLY_MULTI_CURRENCY } from './tally/multi-currency'
import { TALLY_PAYROLL } from './tally/payroll'
import { TALLY_PURCHASE_VOUCHER } from './tally/purchase-voucher'
import { TALLY_REPORTS_BACKUP } from './tally/reports-and-backup'
import { TALLY_SALES_VOUCHER } from './tally/sales-voucher'
import { TALLY_TDS } from './tally/tds'

import { ZOHO_BANKING } from './zoho-books/banking'
import { ZOHO_EXPENSES } from './zoho-books/expenses'
import { ZOHO_GST_RETURNS } from './zoho-books/gst-returns'
import { ZOHO_GST_SETUP } from './zoho-books/gst-setup'
import { ZOHO_INVENTORY } from './zoho-books/inventory'
import { ZOHO_INVOICE } from './zoho-books/invoice'
import { ZOHO_PROJECTS } from './zoho-books/projects'
import { ZOHO_RECURRING } from './zoho-books/recurring'
import { ZOHO_REPORTS } from './zoho-books/reports'
import { ZOHO_SIGNUP } from './zoho-books/signup'

import { QBO_BANKING } from './quickbooks/banking'
import { QBO_EXPENSES } from './quickbooks/expenses'
import { QBO_REPORTS } from './quickbooks/reports'
import { QBO_SALES } from './quickbooks/sales'
import { QBO_SETUP } from './quickbooks/setup'

import type { Guide, GuideStep } from './types'

export type { Guide, GuideStep } from './types'

export const GUIDES: Guide[] = [
  // Tally Prime — full daily workflow + advanced topics
  TALLY_GETTING_STARTED,
  TALLY_MASTERS,
  TALLY_SALES_VOUCHER,
  TALLY_PURCHASE_VOUCHER,
  TALLY_BANKING,
  TALLY_GST_RETURNS,
  TALLY_TDS,
  TALLY_INVENTORY,
  TALLY_COST_CENTRES,
  TALLY_PAYROLL,
  TALLY_MULTI_CURRENCY,
  TALLY_REPORTS_BACKUP,

  // Zoho Books — full workflow + advanced topics
  ZOHO_SIGNUP,
  ZOHO_GST_SETUP,
  ZOHO_INVOICE,
  ZOHO_EXPENSES,
  ZOHO_BANKING,
  ZOHO_INVENTORY,
  ZOHO_PROJECTS,
  ZOHO_RECURRING,
  ZOHO_GST_RETURNS,
  ZOHO_REPORTS,

  // QuickBooks Online — for international / outsourced bookkeeping
  QBO_SETUP,
  QBO_SALES,
  QBO_EXPENSES,
  QBO_BANKING,
  QBO_REPORTS,
]

export function getGuideBySlug(slug: string): Guide | undefined {
  return GUIDES.find((g) => g.slug === slug)
}

export function getGuidesForMarket(market: 'india' | 'ksa'): Guide[] {
  return GUIDES.filter((g) => g.market === market || g.market === 'both')
}

/** Group guides by family for the index page. */
export function groupGuidesByFamily(guides: Guide[]): Record<Guide['family'], Guide[]> {
  const grouped: Record<Guide['family'], Guide[]> = {
    'tally-prime': [],
    'zoho-books': [],
    'quickbooks-online': [],
    other: [],
  }
  for (const g of guides) grouped[g.family].push(g)
  return grouped
}

/** Display name for a family. */
export const FAMILY_LABELS: Record<Guide['family'], { en: string; ar: string; emoji: string }> = {
  'tally-prime': { en: 'Tally Prime', ar: 'تالي برايم', emoji: '📒' },
  'zoho-books': { en: 'Zoho Books', ar: 'زوهو بوكس', emoji: '🌐' },
  'quickbooks-online': { en: 'QuickBooks Online', ar: 'كويك بوكس أونلاين', emoji: '📘' },
  other: { en: 'Other tools', ar: 'أدوات أخرى', emoji: '🛠️' },
}
