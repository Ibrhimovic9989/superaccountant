import type { Guide } from '../types'

export const QBO_EXPENSES: Guide = {
  slug: 'quickbooks-online-expenses',
  title: 'Expenses + bills in QuickBooks Online',
  subtitle: 'Vendor management, bill entry, payment runs, expense receipts',
  hook: 'QBO splits the purchase side into Expenses (paid immediately) and Bills (pay later). Master both flows + the bulk pay-run and you can close month-end in half the time.',
  market: 'both',
  family: 'quickbooks-online',
  estimatedMinutes: 20,
  emoji: '🧾',
  color: 'success',
  prerequisites: ['QBO company set up', 'COA configured'],
  outcomes: [
    'A vendor (supplier) created with W-9 / tax info',
    'A bill recorded with the right expense account + tax',
    'A bill paid via "Pay bills" workflow',
    'A direct expense recorded for paid-on-the-spot purchases',
    'Receipt-snap workflow understood (mobile capture)',
  ],
  startStepId: 'pick-flow',
  steps: [
    {
      id: 'pick-flow',
      label: 'Pick flow',
      title: 'Bill or Expense?',
      body: "**Bill** = vendor invoice you'll pay later. Sits as A/P until paid.\n\n**Expense** = paid at the moment (credit card, ACH, cash). Posts directly without A/P.\n\n**Check** = printed cheque payment.\n\nPick the closest:",
      check: {
        question: 'Choose:',
        options: [
          { label: 'Vendor bill (will pay later)', next: 'create-vendor' },
          { label: 'Expense paid on the spot', next: 'expense' },
          { label: 'Snap a receipt with mobile', next: 'receipt-snap' },
        ],
      },
    },
    {
      id: 'create-vendor',
      label: 'Vendor',
      title: 'Create the vendor',
      body: '**Expenses** → **Vendors** → **New vendor**.\n\n- **Display name**\n- **Email + phone**\n- **Billing address**\n- **Business ID** — EIN / VAT / ABN — for **1099 reporting** in US (mandatory if vendor will receive > $600/year and is an individual / LLC)\n- **Track payments for 1099:** Yes (US contractors)\n- **Default expense account + payment terms**\n\n**Save**.',
      callout: {
        kind: 'warning',
        text: "US: any vendor receiving > $600/year as a contractor needs a **W-9** on file. Without it, you can't issue 1099-NEC at year-end → IRS penalty up to $290 per missing form.",
      },
      next: 'create-bill',
    },
    {
      id: 'create-bill',
      label: 'Bill',
      title: 'Enter a bill',
      body: "**+ New** → **Bill**.\n\n- **Vendor** — pick\n- **Bill no** — vendor's invoice number\n- **Bill date** + **Due date** (auto from terms)\n- **Category** (expense account) OR **Item** (if buying inventory)\n- **Amount + Tax** — sales tax / VAT auto-calc if rates are configured\n- **Memo + attach PDF** of vendor invoice\n\n**Save**.",
      callout: {
        kind: 'tip',
        text: 'Always attach the vendor PDF. Auditors ask for source documents — having it inside QBO saves digging through email later.',
      },
      check: {
        question: 'Bill saved?',
        options: [
          { label: 'Yes', next: 'pay-bills' },
          { label: 'Vendor invoice number error', next: 'fix-bill-no' },
        ],
      },
    },
    {
      id: 'fix-bill-no',
      title: 'Bill number issue',
      body: "QBO doesn't enforce uniqueness on bill numbers, BUT it WARNS on duplicates from the same vendor. If you see one:\n\n1. Check Vendor → vendor → Transactions to find the existing bill\n2. Either it's a real duplicate (delete) or genuinely two invoices same number (append a slash + month)",
      next: 'pay-bills',
    },
    {
      id: 'pay-bills',
      label: 'Pay bills',
      title: 'Pay one or many bills',
      body: "**+ New** → **Pay bills**.\n\n- **Payment account** — bank or credit card\n- **Payment date**\n- **Tick** the bills you're paying — QBO shows total\n- **Partial payment** — edit the amount column to pay part of a bill\n- **Pay method:** Check / ACH / Credit Card\n- **Print check** — generate printable check or send via QBO's bill-pay (Intuit partners)\n\n**Save and close**.",
      callout: {
        kind: 'tip',
        text: 'Bulk pay-run on Friday: tick all due bills + early-discount-eligible bills → one click pays them all + creates one bank entry. 2-min vs 30-min one-by-one.',
      },
      check: {
        question: 'Bills paid?',
        options: [
          { label: 'Yes', next: 'verify' },
          { label: 'Skipping for now', next: 'verify' },
        ],
      },
    },
    {
      id: 'expense',
      label: 'Expense',
      title: 'Record a direct expense',
      body: '**+ New** → **Expense**.\n\n- **Payment account** — credit card / bank / petty cash\n- **Payee** — vendor (or just type a name for one-off)\n- **Date**\n- **Category** + **Amount** + **Tax**\n- **Description**\n- **Attach receipt**\n\n**Save**.',
      callout: {
        kind: 'tip',
        text: 'For credit card expenses, link the credit card account in Banking and let auto-feed pull these in — much faster than typing each.',
      },
      next: 'verify',
    },
    {
      id: 'receipt-snap',
      label: 'Receipt snap',
      title: 'Snap receipts on mobile',
      body: '**QuickBooks mobile app** (iOS / Android) → **Receipt Capture** → take photo of receipt.\n\nQBO auto-extracts:\n- Vendor name\n- Date\n- Total\n- Suggested category (based on past entries)\n\nReview → confirm → it posts as an Expense.\n\nFor batch upload: forward email receipts to **receipts@qbodocs.com** (configured in Settings).',
      callout: {
        kind: 'tip',
        text: 'Best practice: process receipts **same day**. Photo gets blurry, text fades, you forget what you bought. The mobile app makes daily 2-min discipline.',
      },
      next: 'verify',
    },
    {
      id: 'verify',
      label: 'Verify',
      title: 'Verify in reports',
      body: '1. **Reports → Profit and Loss** — expense category line updated\n2. **Reports → Vendor Balance Detail** — A/P open balance per vendor\n3. **Reports → Sales Tax / VAT Liability** — if the bill had recoverable tax (UK / CA / AU)',
      next: 'recurring',
    },
    {
      id: 'recurring',
      label: 'Recurring',
      title: 'Recurring transactions (optional)',
      body: '**Settings (gear)** → **Recurring transactions** → **New**.\n\n- **Type:** Bill / Expense / Invoice\n- **Template** — pick vendor + amount + category\n- **Schedule** — Daily / Weekly / Monthly / Yearly\n- **Start date + end date**\n\nUse for predictable monthly costs: rent, insurance, subscriptions. QBO auto-creates the entry on schedule.',
      next: 'done',
    },
    {
      id: 'flag-instructor',
      title: 'Ask your instructor',
      body: 'Vendor / 1099 setup is country-specific. Bring W-9s / vendor tax IDs to your next class.',
      terminal: true,
    },
    {
      id: 'done',
      title: 'Expenses sorted',
      body: "You've covered every QBO purchase workflow. Habit:\n- **Bills** as soon as vendor invoice arrives\n- **Expenses** for credit-card / spot purchases\n- **Receipt snap** daily\n- **Pay run** every Friday\n\n**Next:** **Banking** — connect the bank, reconcile, match transactions.",
      terminal: true,
    },
  ],
}
