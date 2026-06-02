// Seed `CurriculumLesson.relatedGuideSlugs` with hand-picked theory ->
// practice mappings. The lesson page reads this column and shows a
// "See this in practice" panel with links to the matching interactive
// guides under /guides/<slug>.
//
// Why hand-picked (vs LLM-suggested):
//   - MVP. We need 5+ obvious anchors so the feature is visible end to
//     end. A model-driven suggester can come later and overwrite these.
//   - Predictability beats coverage. A confidently wrong mapping
//     undermines the whole "theory <-> practice" promise.
//
// This script is idempotent — it overwrites `relatedGuideSlugs` for the
// listed slugs every run. Unlisted lessons are untouched.
//
// Run via:
//   cd packages/db && node scripts/seed-related-guides.mjs

import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __d = dirname(fileURLToPath(import.meta.url))
for (const line of readFileSync(resolve(__d, '../.env'), 'utf8').split('\n')) {
  const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim())
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, '')
}
const { PrismaClient } = await import('@prisma/client')
const p = new PrismaClient()

// Source of truth for guide slugs:
//   apps/web/src/lib/data/guides/{tally,zoho-books,quickbooks}/*.ts
// Names below are mirrored verbatim. If a guide is ever renamed, the
// lesson-data helper drops unknown slugs silently — no broken links.
const TALLY = {
  gettingStarted: 'tally-prime-getting-started',
  masters: 'tally-prime-masters',
  salesVoucher: 'tally-prime-sales-voucher',
  purchaseVoucher: 'tally-prime-purchase-voucher',
  banking: 'tally-prime-banking',
  gstReturns: 'tally-prime-gst-returns',
  tds: 'tally-prime-tds',
  inventory: 'tally-prime-inventory',
  costCentres: 'tally-prime-cost-centres',
  payroll: 'tally-prime-payroll',
  multiCurrency: 'tally-prime-multi-currency',
  reportsBackup: 'tally-prime-reports-and-backup',
}

const ZOHO = {
  signup: 'zoho-books-signup',
  gstSetup: 'zoho-books-gst-setup',
  invoice: 'zoho-books-first-invoice',
  expenses: 'zoho-books-expenses',
  banking: 'zoho-books-banking',
  inventory: 'zoho-books-inventory',
  projects: 'zoho-books-projects',
  recurring: 'zoho-books-recurring-invoices',
  gstReturns: 'zoho-books-gst-returns',
  reports: 'zoho-books-reports',
}

const QBO = {
  setup: 'quickbooks-online-setup',
  sales: 'quickbooks-online-sales',
  expenses: 'quickbooks-online-expenses',
  banking: 'quickbooks-online-banking',
  reports: 'quickbooks-online-reports',
}

// Theoretical lesson slug -> practical guide slugs.
// Curated so each mapping has a strong "I just learned this — now I want
// to do it in software" moment. Order = preferred display order.
const MAPPINGS = {
  // ── Software intros (Tally is taught directly in the curriculum) ──
  'in-tally-what-and-features': [TALLY.gettingStarted],
  'in-tally-company-creation': [TALLY.gettingStarted, TALLY.masters],
  'in-tally-groups-and-ledgers': [TALLY.masters],
  'in-tally-accounting-vouchers': [TALLY.salesVoucher, TALLY.purchaseVoucher],
  'in-tally-inventory-vouchers': [TALLY.inventory],

  // ── Vouchers / source documents ──
  'in-voucher-types': [TALLY.salesVoucher, TALLY.purchaseVoucher, ZOHO.invoice, QBO.sales],

  // ── Sales / invoicing (AR side) ──
  'in-ar-process': [ZOHO.invoice, QBO.sales, TALLY.salesVoucher],
  'in-ar-credit-and-collections': [ZOHO.invoice, QBO.sales],
  'in-ar-customer-master': [TALLY.masters, ZOHO.invoice],
  'in-gst-invoice-and-bill-of-supply': [TALLY.salesVoucher, ZOHO.invoice],

  // ── Purchases / expenses (AP side) ──
  'in-ap-process': [TALLY.purchaseVoucher, ZOHO.expenses, QBO.expenses],
  'in-ap-vendor-master-and-recon': [TALLY.masters, ZOHO.expenses, QBO.expenses],

  // ── Banking + reconciliation ──
  'in-brs-introduction': [TALLY.banking, ZOHO.banking, QBO.banking],
  'in-brs-preparation': [TALLY.banking, ZOHO.banking, QBO.banking],
  'in-brs-tally-bank-recon': [TALLY.banking],

  // ── Inventory ──
  'in-inv-what-is-inventory': [TALLY.inventory, ZOHO.inventory],
  'in-inv-fifo-lifo-wac': [TALLY.inventory, ZOHO.inventory],
  'in-inv-as2-lower-of-cost-nrv': [TALLY.inventory, ZOHO.inventory],

  // ── GST ──
  'in-gst-tally-setup': [TALLY.gstReturns, ZOHO.gstSetup],
  'in-gst-returns-gstr1': [TALLY.gstReturns, ZOHO.gstReturns],
  'in-gst-returns-gstr3b': [TALLY.gstReturns, ZOHO.gstReturns],
  'in-gst-returns-gstr2a-2b': [TALLY.gstReturns, ZOHO.gstReturns],

  // ── TDS ──
  'in-tds-in-tally': [TALLY.tds],

  // ── Payroll ──
  'in-payroll-intro': [TALLY.payroll],
  'in-payroll-pf-esi-pt': [TALLY.payroll],
  'in-payroll-tally-setup': [TALLY.payroll],

  // ── Financial statements + MIS reports ──
  'in-final-pl-statement': [TALLY.reportsBackup, ZOHO.reports, QBO.reports],
  'in-final-balance-sheet': [TALLY.reportsBackup, ZOHO.reports, QBO.reports],
  'in-final-cash-flow': [TALLY.reportsBackup, ZOHO.reports, QBO.reports],
  'in-mis-reporting': [TALLY.reportsBackup, ZOHO.reports, QBO.reports],

  // ── Bookkeeping fundamentals (gateway to first software touch) ──
  'in-bk-importance-and-process': [TALLY.gettingStarted, ZOHO.signup, QBO.setup],
}

let updated = 0
let missing = 0
const missingSlugs = []

for (const [lessonSlug, guideSlugs] of Object.entries(MAPPINGS)) {
  // pg array literal: '{a,b,c}'. Slugs are ASCII kebab-case so no
  // quoting headaches.
  const arrayLiteral = `{${guideSlugs.join(',')}}`
  const result = await p.$executeRawUnsafe(
    `UPDATE "CurriculumLesson" SET "relatedGuideSlugs" = $1::text[] WHERE slug = $2`,
    arrayLiteral,
    lessonSlug,
  )
  if (result === 0) {
    missing++
    missingSlugs.push(lessonSlug)
    console.warn(`  · skip ${lessonSlug} (lesson not in DB)`)
  } else {
    updated++
    console.log(`  ✓ ${lessonSlug} -> ${guideSlugs.length} guide(s)`)
  }
}

console.log('')
console.log(`Seeded relatedGuideSlugs for ${updated} lesson(s).`)
if (missing > 0) {
  console.log(`Skipped ${missing} lesson(s) not present in the DB:`)
  for (const s of missingSlugs) console.log(`  - ${s}`)
}

await p.$disconnect()
