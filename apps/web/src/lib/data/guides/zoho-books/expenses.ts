import type { Guide } from '../types'

export const ZOHO_EXPENSES: Guide = {
  slug: 'zoho-books-expenses',
  title: 'Record expenses + bills in Zoho Books',
  subtitle: 'Cash expenses, supplier bills, RCM purchases — every variation',
  hook: "Two flows: **Expenses** for small day-to-day costs (taxi, snacks), **Bills** for proper supplier invoices. We'll cover both.",
  market: 'both',
  family: 'zoho-books',
  estimatedMinutes: 15,
  emoji: '💸',
  color: 'success',
  prerequisites: [
    'Zoho Books org set up with GST',
    'At least one expense account in chart of accounts (Tally\'s "Indirect Expenses")',
  ],
  outcomes: [
    'A petty cash expense recorded',
    'A supplier bill entered with GST input credit',
    'A bill paid (single + bulk payment)',
    'Recurring expenses set up if needed',
  ],
  startStepId: 'pick-flow',
  steps: [
    {
      id: 'pick-flow',
      label: 'Pick flow',
      title: 'Expense or Bill?',
      body: '**Expense** — quick, no supplier invoice. Examples: taxi, lunch, courier, paid-on-the-spot.\n\n**Bill** — proper supplier invoice with GSTIN. Examples: rent, electricity, raw materials. Tracks payable until paid.\n\nPick one:',
      check: {
        question: 'Choose:',
        options: [
          { label: 'Expense (cash, no supplier invoice)', next: 'create-expense' },
          { label: 'Bill (supplier invoice with GST)', next: 'create-vendor' },
          { label: 'Bulk import old bills', next: 'bulk-import' },
        ],
      },
    },
    {
      id: 'create-expense',
      label: 'Expense',
      title: 'Record an expense',
      body: '**Purchases** → **Expenses** → **+ New Expense**.\n\n- **Date**\n- **Expense account:** pick or create (e.g. *Travel*, *Food & Beverages*, *Office Supplies*)\n- **Amount**\n- **Tax:** if you have a tax invoice, pick GST 18% etc. for ITC\n- **Paid through:** Petty Cash / your bank account\n- **Vendor:** optional\n- **Notes** + **Attach receipt** (drag-drop a photo of the bill)\n\n**Save**.',
      callout: {
        kind: 'tip',
        text: "Always attach the receipt photo — it's audit-friendly and Zoho stores it forever. Use the mobile app to snap + record on the go.",
      },
      check: {
        question: 'Expense saved?',
        options: [
          { label: 'Yes', next: 'verify' },
          { label: "Account doesn't exist", next: 'fix-account' },
        ],
      },
    },
    {
      id: 'fix-account',
      title: 'Expense account missing',
      body: 'Click **+ Create New** in the account dropdown.\n\n- **Account type:** Expense\n- **Name:** *Travel Expenses* (or whatever)\n- **Description**\n\nSave → use it.',
      check: {
        question: 'Created and used?',
        options: [
          { label: 'Yes', next: 'verify' },
          { label: 'No', next: 'flag-instructor' },
        ],
      },
    },
    {
      id: 'create-vendor',
      label: 'Vendor',
      title: 'Create the vendor (one-time)',
      body: "For supplier bills you need a vendor (Zoho's word for supplier).\n\n**Contacts** → **+ New** → **Vendor**.\n\n- **Display name:** *Bharat Suppliers*\n- **GSTIN** + **address**\n- **Tax preference:** Taxable / Exempt\n- **Payment terms** (Net 30 etc.)\n\n**Save**. Reuse the vendor for every future bill from them.",
      next: 'create-bill',
    },
    {
      id: 'create-bill',
      label: 'Bill',
      title: 'Create a supplier bill',
      body: "**Purchases** → **Bills** → **+ New**.\n\n- **Vendor:** pick from dropdown\n- **Bill #:** the **supplier's invoice number** (NOT yours)\n- **Bill date** = supplier's invoice date\n- **Due date**\n- **Item or expense account** (depending on bill type)\n  - For inventory: pick the item, qty, rate\n  - For service / overhead: pick expense account, amount\n- **Tax:** GST 18% (etc.) — Zoho auto-records ITC\n- **Place of supply**\n\n**Save**.",
      callout: {
        kind: 'warning',
        text: "Use the **supplier's invoice number** in the Bill # field. GSTR-2B reconciliation matches on this — get it wrong and ITC won't reconcile.",
      },
      check: {
        question: 'Bill saved with ITC?',
        options: [
          { label: 'Yes', next: 'pay-bill' },
          { label: "Tally won't accept supplier inv #", next: 'fix-bill-no' },
        ],
      },
    },
    {
      id: 'fix-bill-no',
      title: 'Duplicate bill number',
      body: "Zoho enforces unique bill numbers per vendor. If it complains, the same supplier invoice was already booked.\n\nDay Book → search the bill number → either it's a real duplicate (delete it) or you legitimately have two invoices with the same number (append a slash + month: *INV-001/Apr*).",
      check: {
        question: 'Saved now?',
        options: [
          { label: 'Yes', next: 'pay-bill' },
          { label: 'No', next: 'flag-instructor' },
        ],
      },
    },
    {
      id: 'pay-bill',
      label: 'Pay',
      title: 'Pay the bill',
      body: 'Two ways:\n\n**Single bill:** open the bill → **Record Payment** → fill amount + date + bank account → save.\n\n**Bulk payment:** Bills list → check multiple bills from the same vendor → **Record Payment** → Zoho lets you pay them all in one transaction.\n\n**Vendor credits** (debit notes) auto-apply when present.',
      callout: {
        kind: 'tip',
        text: "Zoho's **bulk pay** is faster than Tally's one-bill-at-a-time approach. Saves real time when you're processing 20+ bills at month-end.",
      },
      check: {
        question: 'Bill paid?',
        options: [
          { label: 'Yes', next: 'verify' },
          { label: 'Skipping for now', next: 'verify' },
        ],
      },
    },
    {
      id: 'bulk-import',
      label: 'Bulk import',
      title: 'Bulk import old bills (optional)',
      body: "**Purchases** → **Bills** → menu (three dots) → **Import Bills**.\n\nDownload Zoho's **CSV template** → fill rows from your old data → upload.\n\nField order matters — use the template, don't make your own.\n\nUse cases:\n- Switching from another tool (Tally, Excel) and bringing history\n- Catching up after a leave",
      next: 'verify',
    },
    {
      id: 'verify',
      label: 'Verify',
      title: 'Verify in reports',
      body: '1. **Reports → Profit & Loss** → expense lines updated\n2. **Reports → Aged Payables** → vendor outstanding (if bill not yet paid)\n3. **Reports → GST Summary** → ITC for the period reflects the new bills',
      next: 'recurring',
    },
    {
      id: 'recurring',
      label: 'Recurring',
      title: 'Recurring expenses (optional)',
      body: 'For predictable monthly costs (rent, internet, subscriptions):\n\n**Purchases** → **Recurring Bills** → **+ New**.\n\n- Set the **frequency** (monthly, quarterly)\n- Pick the **vendor + amount**\n- **Start date** + **end date**\n\nZoho auto-creates the bill on schedule. You just pay it.',
      check: {
        question: 'Done?',
        options: [
          { label: 'Yes', next: 'done' },
          { label: 'Skip', next: 'done' },
        ],
      },
    },
    {
      id: 'flag-instructor',
      title: 'Ask your instructor',
      body: 'Bill / expense errors usually about vendor or expense account config. Bring screenshots of the failing bill + the vendor profile.',
      terminal: true,
    },
    {
      id: 'done',
      title: 'Expenses + bills sorted',
      body: "You've covered the entire purchase side of Zoho Books. Make these habits:\n\n- **Expenses** at end of day for cash spending\n- **Bills** as soon as supplier invoice arrives (not at month-end)\n- **Recurring** for anything predictable\n\n**Next:** the **Banking** guide to auto-feed your bank statements.",
      terminal: true,
    },
  ],
}
