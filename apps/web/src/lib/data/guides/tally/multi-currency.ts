import type { Guide } from '../types'

export const TALLY_MULTI_CURRENCY: Guide = {
  slug: 'tally-prime-multi-currency',
  title: 'Multi-currency in Tally — invoice in USD, book in INR',
  subtitle: 'Forex transactions, conversion gain/loss, period-end revaluation',
  hook: 'Selling to a US or UK client? Buying from a Chinese supplier? Tally tracks the foreign currency, the INR equivalent, and the exchange gain/loss when the rate moves between invoice and payment.',
  market: 'both',
  family: 'tally-prime',
  estimatedMinutes: 25,
  emoji: '💱',
  color: 'success',
  prerequisites: ['Tally company set up', 'A foreign-currency customer or supplier'],
  outcomes: [
    'Foreign currencies enabled with current exchange rates',
    'Invoice raised in USD with INR booking value',
    'Customer receipt at a different rate — gain/loss auto-recognised',
    'Period-end forex revaluation completed',
  ],
  startStepId: 'enable',
  steps: [
    {
      id: 'enable',
      label: 'Enable',
      title: 'Turn on multi-currency',
      body: 'F11 → **Accounting Features** → **Allow multi-currency: Yes**.\n\nBase currency stays **INR** — you only add additional currencies for foreign transactions. **Ctrl + A** to save.',
      next: 'create-currency',
    },
    {
      id: 'create-currency',
      label: 'Add currency',
      title: 'Add the foreign currency',
      body: 'Gateway → **Create** → **Currency**.\n\n- **Symbol:** $\n- **Formal name:** US Dollar\n- **Decimal symbol:** . (period)\n- **Decimal places:** 2\n- **Word for amount:** Dollars\n- **Show amount in millions:** No\n\n**Ctrl + A** to save. Repeat for any other currencies (EUR, GBP, AED).',
      next: 'rates',
    },
    {
      id: 'rates',
      label: 'Rates',
      title: 'Set exchange rates',
      body: 'Gateway → **Display More Reports** → **Account Books** → **Exchange Rates** → press **F2** to set date.\n\nFor each currency:\n- **Standard rate:** the contractual / invoice rate\n- **Selling rate:** what you receive when converting USD → INR (used for receipts)\n- **Buying rate:** what you pay when converting INR → USD (used for payments)\n\nUpdate rates **monthly minimum**, ideally weekly. Source: **rbi.org.in** (RBI reference rate) or your AD bank.',
      callout: {
        kind: 'warning',
        text: "Rates auto-fill at the LATEST available date in the system. If you book a back-dated invoice, MANUALLY set the rate for that date — Tally won't guess.",
      },
      check: {
        question: 'Rates updated?',
        options: [
          { label: 'Yes', next: 'invoice' },
          { label: 'Where to find RBI rate', next: 'fix-rate' },
        ],
      },
    },
    {
      id: 'fix-rate',
      title: 'Finding the right rate',
      body: '**rbi.org.in** → Notifications → search "Reference Rate" — daily PDF with USD, EUR, GBP, JPY rates.\n\nOr use your bank\'s daily forex rate (HDFC, ICICI publish on website). Stick to ONE source for consistency.',
      next: 'invoice',
    },
    {
      id: 'invoice',
      label: 'USD invoice',
      title: 'Raise an invoice in USD',
      body: "First make sure your **customer ledger** has currency = USD (or the right one):\nAlter → customer → **Currency: USD**.\n\nThen book the sales voucher as usual:\n- **Party:** *Acme Inc (US)*\n- **Amount:** $5,000 — Tally auto-converts at today's rate (e.g. $5,000 × 83.50 = ₹4,17,500 INR equivalent)\n- The voucher books revenue in INR (₹4,17,500) but the customer ledger stores USD ($5,000)\n\n**Ctrl + A** to save.",
      callout: {
        kind: 'tip',
        text: 'GST on exports: 0% (zero-rated supply). Use **Tax Type: Zero-rated** in the voucher and tag it as Export → with LUT or with-payment-of-IGST as applicable.',
      },
      check: {
        question: 'USD invoice booked?',
        options: [
          { label: 'Yes', next: 'receipt' },
          { label: 'Currency not converting', next: 'fix-conversion' },
        ],
      },
    },
    {
      id: 'fix-conversion',
      title: 'Conversion not working',
      body: '1. **Customer ledger has wrong currency** — Alter, set USD\n2. **No exchange rate for invoice date** — set it via Display → Exchange Rates\n3. **Sales ledger** is in INR (correct) but party in USD — that triggers conversion\n\nFix in that order.',
      check: {
        question: 'Working now?',
        options: [
          { label: 'Yes', next: 'receipt' },
          { label: 'No', next: 'flag-instructor' },
        ],
      },
    },
    {
      id: 'receipt',
      label: 'Receive payment',
      title: 'Receive USD at a different rate',
      body: "Two months later, customer pays $5,000. Rate is now **84.20** (rupee weakened):\n\n- **F6 (Receipt)** → bank account → customer → amount $5,000\n- Tally converts at today's rate: $5,000 × 84.20 = **₹4,21,000**\n- Original invoice booked at ₹4,17,500\n- **Forex gain: ₹3,500** — Tally auto-posts to *Forex Gain/Loss A/c*\n\n**Ctrl + A** to save.",
      callout: {
        kind: 'tip',
        text: "Forex Gain / Loss is **Indirect Income / Expense** — flows into the P&L. Don't book it as a regular sale — it skews top-line revenue.",
      },
      next: 'revaluation',
    },
    {
      id: 'revaluation',
      label: 'Revaluation',
      title: 'Period-end revaluation of open balances',
      body: 'At month-end / year-end, your **open USD balances** (unpaid invoices, unpaid bills, foreign-currency bank balances) need restating at the closing rate. This is **AS 11 / Ind AS 21** mandated.\n\nGateway → **Display** → **Forex Gain/Loss** → set period → review unrealised gain/loss.\n\nTally auto-suggests the journal: Dr/Cr each foreign-currency ledger by the difference, balanced by *Forex Gain/Loss A/c (unrealised)*. Post the journal voucher → **Ctrl + A** to save.',
      callout: {
        kind: 'warning',
        text: "Realised gain (on actual receipt) and unrealised gain (on revaluation) hit different ledgers. Don't lump them — auditors check this.",
      },
      next: 'reports',
    },
    {
      id: 'reports',
      label: 'Reports',
      title: 'Forex reports',
      body: "- **Forex Gain/Loss report** — period-wise realised + unrealised\n- **Customer ledger** — shows BOTH USD and INR side by side\n- **Bank Book** for forex bank account — USD balance + INR equivalent\n\nFor compliance, also generate the **FEMA / RBI reporting** workbook from your bank — Tally doesn't auto-file FEMA, but its data feeds the BRC reconciliation.",
      next: 'done',
    },
    {
      id: 'flag-instructor',
      title: 'Ask your instructor',
      body: 'Multi-currency edge cases (forward contracts, hedging, partial conversions) are firm-specific. Bring your foreign customer / supplier list + recent forex statements to your next class.',
      terminal: true,
    },
    {
      id: 'done',
      title: 'Multi-currency mastered',
      body: "Most Indian SMEs invoicing the US / UK / EU need exactly this. The forex gain/loss handling separates 'someone who can use Tally' from 'someone who actually understands the books'.\n\n**Next:** **Reports & Backup** to close the Tally loop, or move to **Zoho Books / QuickBooks** guides for the cloud equivalents.",
      terminal: true,
    },
  ],
}
