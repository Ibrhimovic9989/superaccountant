import type { Guide } from '../types'

export const TALLY_SALES_VOUCHER: Guide = {
  slug: 'tally-prime-sales-voucher',
  title: 'Record sales vouchers in Tally',
  subtitle: 'Cash sales, credit sales, with GST — every variation covered',
  hook: "Sales vouchers are 80% of an accountant's daily work. Get the workflow into your fingers and you can book 50 invoices an hour.",
  market: 'both',
  family: 'tally-prime',
  estimatedMinutes: 20,
  emoji: '💰',
  color: 'accent',
  prerequisites: [
    'Masters set up — customer ledgers, sales ledger, stock items',
    'GST configured in F11',
  ],
  outcomes: [
    'Cash sale recorded with auto-GST split',
    'Credit sale to a registered customer with bill-by-bill tracking',
    'Inter-state sale with IGST instead of CGST + SGST',
    'Sales return (credit note) processed',
  ],
  startStepId: 'pick-type',
  steps: [
    {
      id: 'pick-type',
      label: 'Pick type',
      title: 'What kind of sale are you recording?',
      body: "Sales vouchers come in flavours. We'll route you to the right one.",
      check: {
        question: 'Pick the closest match:',
        options: [
          { label: 'Cash sale (party paid immediately)', next: 'cash-sale' },
          { label: 'Credit sale (party will pay later)', next: 'credit-sale' },
          { label: 'Inter-state sale (party in different state)', next: 'igst-sale' },
          { label: 'Sales return (customer returning goods)', next: 'sales-return' },
        ],
      },
    },
    {
      id: 'cash-sale',
      label: 'Cash sale',
      title: 'Record a cash sale',
      body: 'Gateway → **Vouchers** → **F8 (Sales)**.\n\n- **Date:** today\n- **Party A/c name:** *Cash*\n- **Sales ledger:** *Sales — Goods*\n- **Item:** pick from stock list, **Qty + Rate**\n- **GST** auto-fills from the stock item\n- **Total** auto-calculates\n\nPress **Ctrl + A** to save. Tally prints the invoice number on the next blank voucher.',
      callout: {
        kind: 'tip',
        text: 'Press **Alt + P** in the voucher to print the invoice. Or **Alt + L** to view it as a tax invoice before saving.',
      },
      check: {
        question: 'Cash sale saved?',
        options: [
          { label: 'Yes', next: 'verify' },
          { label: 'GST not splitting right', next: 'fix-gst-split' },
        ],
      },
    },
    {
      id: 'credit-sale',
      label: 'Credit sale',
      title: 'Record a credit sale',
      body: 'Same as cash sale but party = customer ledger.\n\n- **Party A/c name:** *Acme Traders Pvt Ltd*\n- **Sales ledger:** *Sales — Goods*\n- **Stock item, qty, rate** as usual\n\nIn the **Bill-wise Details** screen that pops up:\n- **Type of Ref:** New Ref\n- **Name:** invoice number (e.g. *INV-001*)\n- **Due date:** typically today + 30 days\n\n**Ctrl + A** to save.',
      callout: {
        kind: 'tip',
        text: 'The bill reference is what lets you match a payment receipt to this specific invoice later. Without it, payments end up as "on-account" credits.',
      },
      check: {
        question: 'Credit sale saved with bill ref?',
        options: [
          { label: 'Yes', next: 'verify' },
          { label: 'Bill-wise screen not showing', next: 'fix-bill-wise' },
        ],
      },
    },
    {
      id: 'fix-bill-wise',
      title: "Bill-wise screen didn't show",
      body: "Means the customer ledger doesn't have **bill-by-bill** turned on.\n\nFix: Gateway → **Alter** → **Ledger** → pick the customer → set **Maintain balances bill-by-bill: Yes** → save → re-do the voucher.",
      check: {
        question: 'Bill-wise working now?',
        options: [
          { label: 'Yes', next: 'verify' },
          { label: 'Still off', next: 'flag-instructor' },
        ],
      },
    },
    {
      id: 'igst-sale',
      label: 'Inter-state',
      title: 'Inter-state sale (IGST)',
      body: "When the customer's state ≠ your firm's state, GST is **IGST 18%** (or whatever the slab) instead of **CGST 9% + SGST 9%**. Tally picks this automatically based on the customer's address.\n\nWorkflow is identical to a credit sale — just confirm the customer ledger has the right state.",
      callout: {
        kind: 'warning',
        text: "If Tally splits as CGST + SGST when you expected IGST, the customer ledger's state is set wrong. Fix the ledger first, then re-do the voucher.",
      },
      check: {
        question: 'IGST showing correctly?',
        options: [
          { label: 'Yes', next: 'verify' },
          { label: 'Tally split as CGST+SGST', next: 'fix-state-issue' },
        ],
      },
    },
    {
      id: 'fix-state-issue',
      title: 'Wrong state on customer',
      body: "Gateway → **Alter** → **Ledger** → pick the customer → check **State** field — must match the customer's GSTIN state code (first 2 digits of GSTIN). Save → re-do the voucher.",
      check: {
        question: 'Inter-state IGST now?',
        options: [
          { label: 'Yes', next: 'verify' },
          { label: 'No', next: 'flag-instructor' },
        ],
      },
    },
    {
      id: 'sales-return',
      label: 'Sales return',
      title: 'Sales return (credit note)',
      body: 'When a customer returns goods, you issue a **credit note** that reduces their outstanding.\n\nGateway → **Vouchers** → **Alt + F6 (Credit Note)**.\n\n- **Party:** customer ledger\n- **Sales ledger:** same as original sale\n- **Stock item + qty + rate** of the returned goods\n- **GST** auto-reverses\n\n**Ctrl + A** to save.',
      callout: {
        kind: 'warning',
        text: "Credit notes flow into GSTR-1's CDNR section. Always reference the original invoice number in the narration so the auditor can trace it.",
      },
      check: {
        question: 'Credit note saved?',
        options: [
          { label: 'Yes', next: 'verify' },
          { label: "Alt+F6 doesn't work", next: 'fix-credit-note' },
        ],
      },
    },
    {
      id: 'fix-credit-note',
      title: 'Credit note shortcut not working',
      body: 'Some Tally versions need credit note enabled in F11.\n\nF11 → **Show more features** → **Use Debit/Credit Notes:** Yes → save.\n\nOr from the voucher screen press **F10** to see all available voucher types and pick **Credit Note** from there.',
      check: {
        question: 'Credit note working now?',
        options: [
          { label: 'Yes', next: 'verify' },
          { label: 'No', next: 'flag-instructor' },
        ],
      },
    },
    {
      id: 'fix-gst-split',
      title: 'GST not splitting right',
      body: '1. **Sales ledger missing GST rate?** — Alter the ledger, set GST rate (18%, 12%, etc.)\n2. **Stock item missing GST rate?** — Alter, set rate\n3. **Place of supply mismatch?** — Press F12 in the voucher → check Place of Supply\n\nQuickest fix: re-create the voucher after fixing the ledger/item.',
      check: {
        question: 'GST splitting correctly?',
        options: [
          { label: 'Yes', next: 'verify' },
          { label: 'Still off', next: 'flag-instructor' },
        ],
      },
    },
    {
      id: 'verify',
      label: 'Verify',
      title: 'Verify the entry',
      body: "Three quick checks:\n\n1. **Day Book** — Display More Reports → Day Book — your voucher shows up here\n2. **P&L** — Sales — Goods has the new amount\n3. **GSTR-1 preview** — Display → GST Reports → GSTR-1 — your invoice shows in B2B / B2C / Inter-state as applicable\n\nIf all three look right, you're done.",
      check: {
        question: 'All three reports show the entry?',
        options: [
          { label: 'Yes', next: 'done' },
          { label: 'Missing from one', next: 'flag-instructor' },
        ],
      },
    },
    {
      id: 'flag-instructor',
      title: 'Bring this to your instructor',
      body: 'Sales voucher errors are usually about ledger/item config. Take a screenshot of the failing voucher and the customer/sales ledger setup — your instructor will spot the mismatch quickly.',
      terminal: true,
    },
    {
      id: 'done',
      title: 'Sales voucher mastered',
      body: 'You can now record any kind of sales transaction. Practice tip: book 5 vouchers — 1 cash, 2 credit, 1 inter-state, 1 return — to lock the muscle memory.\n\n**Next:** the **Purchase Voucher** guide for the mirror-image workflow.',
      terminal: true,
    },
  ],
}
