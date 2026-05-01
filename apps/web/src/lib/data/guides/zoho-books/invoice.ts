import type { Guide } from '../types'

export const ZOHO_INVOICE: Guide = {
  slug: 'zoho-books-first-invoice',
  title: 'Create your first invoice in Zoho Books',
  subtitle: 'Customer → invoice → email → payment, end-to-end',
  hook: "The most common workflow you'll do — multiple times a day. Get it down cold and you'll move fast forever.",
  market: 'india',
  family: 'zoho-books',
  estimatedMinutes: 15,
  emoji: '🧾',
  color: 'accent',
  prerequisites: [
    'Zoho Books org with GST configured',
    'At least one item created (or ready to create)',
  ],
  outcomes: [
    'A customer (contact) created with GSTIN + address',
    'An item (product or service) created with HSN/SAC + GST rate',
    'An invoice issued, emailed to the customer, and downloadable as PDF',
    'A payment recorded against the invoice',
  ],
  startStepId: 'create-customer',
  steps: [
    {
      id: 'create-customer',
      label: 'Customer',
      title: 'Create a customer',
      body: '**Contacts** → **+ New** → **Customer**.\n\n- **Customer type:** Business / Individual\n- **Display name:** *Acme Traders Pvt Ltd*\n- **Email + phone**\n- **Billing address** + **Shipping address**\n- **GSTIN:** if registered\n- **Tax preference:** Taxable / Tax Exempt\n- **Currency:** INR\n- **Payment terms:** Net 30 (or whatever)\n\n**Save**.',
      callout: {
        kind: 'warning',
        text: "Customer's billing-state must match the first 2 digits of their GSTIN. Mismatch = wrong tax (CGST/SGST vs IGST) on the invoice.",
      },
      check: {
        question: 'Customer saved?',
        options: [
          { label: 'Yes', next: 'create-item' },
          { label: 'GSTIN error', next: 'fix-gstin-customer' },
        ],
      },
    },
    {
      id: 'fix-gstin-customer',
      title: 'GSTIN error on customer',
      body: 'GSTIN format is **15 chars**. Verify yours at **services.gst.gov.in** → Search Taxpayer.\n\nLeave blank if customer is unregistered — Zoho will treat the invoice as B2C automatically.',
      check: {
        question: 'Saved now?',
        options: [
          { label: 'Yes', next: 'create-item' },
          { label: 'No', next: 'flag-instructor' },
        ],
      },
    },
    {
      id: 'create-item',
      label: 'Item',
      title: 'Create an item (product or service)',
      body: '**Items** → **+ New**.\n\n- **Type:** Goods (with stock) / Services\n- **Name:** *Office Chair — Black* or *Consulting Hour*\n- **SKU** (optional but useful)\n- **Unit:** *Nos*, *Hour*, *Box*\n- **Selling price** (excl tax)\n- **Tax rate:** GST 18% (or whichever applies)\n- **HSN/SAC code**\n- **Description** (appears on invoice line)\n\n**Save**.',
      check: {
        question: 'Item saved?',
        options: [
          { label: 'Yes', next: 'create-invoice' },
          { label: 'Tax not picking up', next: 'fix-tax' },
        ],
      },
    },
    {
      id: 'fix-tax',
      title: 'Tax not on the item',
      body: "Settings → **Taxes** → **Tax Rates** — confirm the rate you want exists. If GST hasn't been enabled yet, run the **GST Setup** guide first.",
      check: {
        question: 'Tax working?',
        options: [
          { label: 'Yes', next: 'create-invoice' },
          { label: 'No', next: 'flag-instructor' },
        ],
      },
    },
    {
      id: 'create-invoice',
      label: 'Invoice',
      title: 'Create the invoice',
      body: '**Sales** → **Invoices** → **+ New**.\n\n- **Customer:** pick from dropdown — Zoho fills in address, GSTIN, payment terms automatically\n- **Invoice #:** auto-incremented (Settings → Sales → Invoices to customize the format)\n- **Invoice date** + **Due date**\n- **Item table:** add items with qty + rate — tax auto-calculates\n- **Notes** (optional, customer-visible)\n- **Terms & conditions** (optional)\n\n**Save and Send** to email immediately, or **Save as Draft** to review first.',
      callout: {
        kind: 'tip',
        text: 'Zoho calculates CGST + SGST or IGST based on your state vs customer state — no manual selection needed.',
      },
      check: {
        question: 'Invoice created?',
        options: [
          { label: 'Yes — sent to customer', next: 'verify-tax' },
          { label: 'Wrong tax type (got CGST when expected IGST)', next: 'fix-tax-type' },
        ],
      },
    },
    {
      id: 'fix-tax-type',
      title: 'Wrong tax type on invoice',
      body: "1. **Customer state** ≠ your firm state? → Zoho should pick IGST automatically. If it picked CGST/SGST, the customer's state setting is wrong\n2. **Place of Supply override** — open the invoice → Tax section → confirm POS state\n3. **Org state wrong** — Settings → Organization Profile",
      check: {
        question: 'Tax correct now?',
        options: [
          { label: 'Yes', next: 'verify-tax' },
          { label: 'No', next: 'flag-instructor' },
        ],
      },
    },
    {
      id: 'verify-tax',
      label: 'Verify tax',
      title: 'Verify the tax breakdown',
      body: 'On the saved invoice, scroll down to the totals box. You should see:\n\n- **Subtotal** (taxable value)\n- **CGST + SGST** (intra-state) OR **IGST** (inter-state)\n- **Total payable**\n\nIf splits look right, the invoice is GST-compliant.',
      next: 'send',
    },
    {
      id: 'send',
      label: 'Send',
      title: 'Email or download the invoice',
      body: '**Send** button at the top:\n\n- **Send via email** — Zoho emails the PDF + payment link to customer\n- **Download PDF** — for WhatsApp / manual sending\n- **Print**\n\nThe **payment link** lets the customer pay via UPI / card / netbanking — Zoho auto-records the payment when they pay.',
      next: 'record-payment',
    },
    {
      id: 'record-payment',
      label: 'Payment',
      title: 'Record a payment (when customer pays)',
      body: 'When the customer pays:\n\nOpen the invoice → **Record Payment** (top-right).\n\n- **Amount paid:** full or partial\n- **Date paid**\n- **Payment mode:** Cash / Bank Transfer / Cheque / UPI / etc.\n- **Deposit to:** the bank/cash account that received the money\n- **Reference #:** UTR / cheque number (optional)\n\n**Save**. Invoice status flips to **Paid** (or **Partially Paid**).',
      callout: {
        kind: 'tip',
        text: 'If the customer paid more than the invoice amount, Zoho creates a **customer credit** automatically. Apply it to the next invoice you raise.',
      },
      check: {
        question: 'Payment recorded + invoice marked paid?',
        options: [
          { label: 'Yes', next: 'done' },
          { label: 'Skipping for now', next: 'done' },
        ],
      },
    },
    {
      id: 'flag-instructor',
      title: 'Ask your instructor',
      body: 'Take a screenshot of the failing invoice + the customer/item setup. Your instructor will spot the misconfiguration in 30 seconds.',
      terminal: true,
    },
    {
      id: 'done',
      title: 'First invoice done!',
      body: "You've now done the most common Zoho workflow end-to-end. Practice tip: book 5 invoices to different customers (mix of B2B / B2C / inter-state) to lock the muscle memory.\n\n**Next:** the **Expenses** guide for the purchase side, or **Banking** to auto-feed your bank statements.",
      terminal: true,
    },
  ],
}
