import type { Guide } from '../types'

export const TALLY_MASTERS: Guide = {
  slug: 'tally-prime-masters',
  title: 'Set up your Tally masters',
  subtitle: 'Groups, ledgers, stock items — the foundation under every voucher',
  hook: 'Most Tally errors start in the masters. Build them right once and every voucher you book afterwards just works.',
  market: 'both',
  family: 'tally-prime',
  estimatedMinutes: 25,
  emoji: '🗂️',
  color: 'success',
  prerequisites: ['Tally Prime installed and a company created', 'GST enabled in F11'],
  outcomes: [
    'A clean ledger group structure tailored to your business',
    'Customer + supplier ledgers with addresses and GSTIN',
    'Stock items with HSN codes and the correct GST rate',
    'Units of measure and stock groups set up for inventory',
  ],
  startStepId: 'overview',
  steps: [
    {
      id: 'overview',
      label: 'Overview',
      title: 'What are masters?',
      body: "In Tally, anything you record into is a **master**. There are five families:\n\n1. **Groups** — categories like *Sales Accounts*, *Sundry Debtors*\n2. **Ledgers** — actual accounts: *Cash*, *HDFC Bank*, *Acme Pvt Ltd*\n3. **Stock items** — products you buy/sell\n4. **Stock groups** + **units** — categories and units of measure\n5. **Cost centres** — for tracking by branch/project (optional)\n\nWe'll set them up in order so each builds on the last.",
      next: 'group-structure',
    },
    {
      id: 'group-structure',
      label: 'Groups',
      title: 'Review the default groups',
      body: "Tally ships with **28 default groups**. Don't make new ones unless you really need to — accountants reading your books expect the standard layout.\n\nGateway → **Chart of Accounts** → **Groups**. You'll see Capital Account, Loans, Current Assets, Current Liabilities, etc.",
      callout: {
        kind: 'tip',
        text: 'A new group should be a **sub-group** under a default one. Example: under *Indirect Expenses* you can add *Marketing Expenses* as a sub-group.',
      },
      check: {
        question: 'Can you see the 28 default groups?',
        options: [
          { label: 'Yes', next: 'create-customer' },
          { label: "Don't see Chart of Accounts", next: 'fix-chart' },
        ],
      },
    },
    {
      id: 'fix-chart',
      title: 'Finding the Chart of Accounts',
      body: 'In Tally Prime, press **D** at the Gateway → **Chart of Accounts**. If still missing, go to **Display More Reports** → **Account Books** → **Group Summary**.',
      check: {
        question: 'Found it?',
        options: [
          { label: 'Yes', next: 'create-customer' },
          { label: 'No', next: 'flag-instructor' },
        ],
      },
    },
    {
      id: 'create-customer',
      label: 'Customer ledger',
      title: 'Create a customer ledger',
      body: "Gateway → **Create** → **Ledger**.\n\n- **Name:** *Acme Traders Pvt Ltd*\n- **Under:** Sundry Debtors\n- **Maintain balances bill-by-bill:** Yes (lets you track unpaid invoices)\n- **Address + GSTIN:** fill from the customer's tax invoice\n- **Registration type:** Regular / Composition / Unregistered\n\nPress **Ctrl + A** to save.",
      callout: {
        kind: 'warning',
        text: 'Get the GSTIN right — Tally validates it. A wrong GSTIN means GSTR-1 will reject the invoice when you file.',
      },
      check: {
        question: 'Customer ledger saved?',
        options: [
          { label: 'Yes', next: 'create-supplier' },
          { label: 'GSTIN rejected', next: 'fix-gstin-validation' },
        ],
      },
    },
    {
      id: 'fix-gstin-validation',
      title: 'GSTIN validation issue',
      body: "GSTIN must be **15 chars** in the format `[State 2][PAN 10][Entity 1]Z[Check 1]`.\n\nDouble-check with the customer's tax invoice. If unsure, you can verify a GSTIN at **services.gst.gov.in** → Search Taxpayer.",
      check: {
        question: 'Saved now?',
        options: [
          { label: 'Yes', next: 'create-supplier' },
          { label: 'Skip — leave blank for now', next: 'create-supplier' },
        ],
      },
    },
    {
      id: 'create-supplier',
      label: 'Supplier ledger',
      title: 'Create a supplier ledger',
      body: 'Same flow, different group:\n\n- **Name:** *Bharat Suppliers*\n- **Under:** Sundry Creditors\n- **Bill-by-bill:** Yes\n- **Address + GSTIN:** fill\n\n**Ctrl + A** to save.',
      check: {
        question: 'Supplier saved?',
        options: [
          { label: 'Yes', next: 'create-bank' },
          { label: 'Need help', next: 'flag-instructor' },
        ],
      },
    },
    {
      id: 'create-bank',
      label: 'Bank ledger',
      title: 'Create your bank ledger',
      body: 'Gateway → **Create** → **Ledger**.\n\n- **Name:** *HDFC Bank — 0123*\n- **Under:** Bank Accounts\n- **Account No:** your full account number\n- **IFSC:** the IFSC code\n- **Branch:** branch name\n\n**Ctrl + A** to save.',
      callout: {
        kind: 'tip',
        text: 'Naming convention: include the last 4 digits of the account in the ledger name. Saves you when there are multiple bank accounts.',
      },
      check: {
        question: 'Bank ledger created?',
        options: [
          { label: 'Yes', next: 'unit-of-measure' },
          { label: 'Got error', next: 'flag-instructor' },
        ],
      },
    },
    {
      id: 'unit-of-measure',
      label: 'Units',
      title: 'Set up units of measure',
      body: 'Before stock items, you need **units** (Nos, Kgs, Box, Litres…).\n\nGateway → **Create** → **Unit**.\n\n- **Symbol:** *Nos*\n- **Formal name:** *Numbers*\n- **Decimal places:** 0\n\n**Ctrl + A** to save. Repeat for *Kgs*, *Pcs* if needed.',
      check: {
        question: 'Unit created?',
        options: [
          { label: 'Yes', next: 'create-stock-item' },
          { label: 'Skip — service-only business', next: 'service-business' },
        ],
      },
    },
    {
      id: 'service-business',
      title: 'Service-only business',
      body: 'If you only sell services (consulting, freelance, etc.), skip stock items entirely. Use a single **Sales — Services** ledger with the right SAC code instead of an HSN code.\n\nGo back and create a *Sales — Services* ledger under **Sales Accounts** with the SAC code in the GST details.',
      next: 'review',
    },
    {
      id: 'create-stock-item',
      label: 'Stock items',
      title: 'Create your first stock item',
      body: "Gateway → **Create** → **Stock Item**.\n\n- **Name:** *Office Chair — Black*\n- **Under:** Primary (or a stock group)\n- **Units:** Nos\n- **HSN code:** lookup at **cbic-gst.gov.in/hsn-search**\n- **GST rate:** matches HSN (e.g. 18% for office furniture)\n- **Opening balance:** 0 (we'll add stock via vouchers)\n\n**Ctrl + A** to save.",
      callout: {
        kind: 'warning',
        text: 'Wrong HSN = wrong GST rate = penalty under §122 CGST. Always verify HSN against the official GST schedule before saving.',
      },
      check: {
        question: 'Stock item saved?',
        options: [
          { label: 'Yes', next: 'review' },
          { label: "Can't find HSN", next: 'fix-hsn' },
        ],
      },
    },
    {
      id: 'fix-hsn',
      title: 'Finding the right HSN',
      body: 'HSN codes are 4, 6, or 8 digits. Indian businesses with turnover ≥ ₹5 cr use 6-digit; ≥ ₹1.5 cr use 4-digit.\n\nLook up at **cbic-gst.gov.in/gst-goods-services-rates.html** or use the search inside Tally itself (start typing the product name in the HSN field).',
      check: {
        question: 'Got HSN now?',
        options: [
          { label: 'Yes', next: 'review' },
          { label: 'Skip — fill in later', next: 'review' },
        ],
      },
    },
    {
      id: 'review',
      label: 'Review',
      title: "Let's review your masters",
      body: "Gateway → **Chart of Accounts** to see everything you've created. You should have:\n\n- ✅ At least one customer (Sundry Debtors)\n- ✅ At least one supplier (Sundry Creditors)\n- ✅ A bank ledger\n- ✅ Sales — Goods ledger\n- ✅ Stock items with HSN + GST rate\n\nIf any of these are missing, go back and add them — the next guides assume they exist.",
      check: {
        question: 'All masters in place?',
        options: [
          { label: 'Yes — ready for vouchers', next: 'done' },
          { label: 'Need to revisit', next: 'flag-instructor' },
        ],
      },
    },
    {
      id: 'flag-instructor',
      title: 'Ask your instructor',
      body: 'Master setup is highly business-specific. Bring your tax invoice samples to your next class — your instructor will help you build the right groups and HSN mappings for your firm.',
      terminal: true,
    },
    {
      id: 'done',
      title: 'Masters done!',
      body: 'Your foundation is solid. From here, the workflow guides are quick:\n\n- **Sales Voucher** — record sales (cash + credit, with GST)\n- **Purchase Voucher** — record purchases\n- **Banking** — payments + receipts + reconciliation\n\nPick whichever workflow you do most often.',
      terminal: true,
    },
  ],
}
