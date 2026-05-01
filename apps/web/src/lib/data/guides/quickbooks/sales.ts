import type { Guide } from '../types'

export const QBO_SALES: Guide = {
  slug: 'quickbooks-online-sales',
  title: 'Sales workflow in QuickBooks Online',
  subtitle: 'Customer → estimate → invoice → payment, with sales tax handled automatically',
  hook: "The sales side of QBO. By the end of this guide you'll create a customer, raise an estimate, convert it to an invoice, and record the payment.",
  market: 'both',
  family: 'quickbooks-online',
  estimatedMinutes: 20,
  emoji: '💼',
  color: 'accent',
  prerequisites: ['QBO company set up with sales tax configured'],
  outcomes: [
    'A customer created with billing/shipping addresses',
    'A product or service item created',
    'An estimate sent → converted to an invoice',
    'A payment recorded against the invoice',
    'A sales receipt for an over-the-counter cash sale',
  ],
  startStepId: 'create-customer',
  steps: [
    {
      id: 'create-customer',
      label: 'Customer',
      title: 'Create a customer',
      body: '**Sales** → **Customers** → **New customer**.\n\n- **Display name** — how it appears on invoices\n- **Email** + **phone**\n- **Billing address** + **Shipping address**\n- **Tax info** — for US, enter ship-to address (drives auto sales tax). For UK, enter VAT number if registered\n- **Payment terms** — Net 30 / Net 15 / Due on receipt\n- **Default tax code** — Taxable / Out of scope\n\n**Save**.',
      callout: {
        kind: 'warning',
        text: "For US clients with multi-state customers, ENTER THE FULL SHIP-TO ADDRESS. Without it, QBO can't auto-calculate sales tax.",
      },
      check: {
        question: 'Customer saved?',
        options: [
          { label: 'Yes', next: 'create-item' },
          { label: 'Got error', next: 'flag-instructor' },
        ],
      },
    },
    {
      id: 'create-item',
      label: 'Item',
      title: 'Create products + services',
      body: "**Sales** → **Products and services** → **New**.\n\nFour types:\n- **Inventory** — physical goods you stock (Plus + only)\n- **Non-inventory** — physical goods you don't stock\n- **Service** — hours / consulting\n- **Bundle** — groups of items sold together\n\nFor each:\n- **Name + SKU**\n- **Sales price**\n- **Income account** — pick from COA (e.g. *Service Revenue*)\n- **Tax code** — Taxable / Non-taxable\n\n**Save**.",
      next: 'estimate',
    },
    {
      id: 'estimate',
      label: 'Estimate',
      title: 'Create an estimate (quote)',
      body: '**+ New** → **Estimate**.\n\n- **Customer**\n- **Estimate date** + **Expiration date**\n- **Items** — pick + qty + rate\n- **Tax** — auto-calculated from customer ship-to + item tax code\n- **Message + memo** for client\n\n**Save and send** — emails the estimate as a PDF with an **Accept / Decline** link the client can click.',
      callout: {
        kind: 'tip',
        text: "If the client can't accept online, no problem — once they say yes by email/call, you'll convert the estimate to an invoice manually in the next step.",
      },
      check: {
        question: 'Estimate sent?',
        options: [
          { label: 'Yes', next: 'convert' },
          { label: 'Skip — go straight to invoice', next: 'invoice' },
        ],
      },
    },
    {
      id: 'convert',
      label: 'Convert',
      title: 'Convert estimate → invoice',
      body: 'Sales → Estimates → open the accepted estimate → **Create invoice**.\n\nQBO copies all line items + amounts. You can:\n- Convert the **whole** estimate\n- Convert **partial** (for staged billing)\n\nReview, save, send.',
      next: 'verify',
    },
    {
      id: 'invoice',
      label: 'Invoice',
      title: 'Create an invoice from scratch',
      body: "**+ New** → **Invoice**.\n\n- **Customer**\n- **Invoice date** + **Due date** (auto from payment terms)\n- **Items + qty + rate**\n- **Tax** — auto-calc\n- **Custom fields** — invoice number format set in Settings → Sales\n- **Online payment** — toggle ON to embed Stripe / PayPal / ACH link in the invoice email\n\n**Save and send** OR **Save and close** if you'll send later.",
      callout: {
        kind: 'tip',
        text: 'Online payment doubles the speed of receivables collection. Set up Intuit Merchant Services or QuickBooks Payments for ACH (US) — fees ~1% vs ~3% on credit cards.',
      },
      next: 'verify',
    },
    {
      id: 'verify',
      label: 'Verify',
      title: 'Verify the invoice',
      body: "Open the invoice. Check:\n\n- **Customer + ship-to** correct\n- **Tax breakdown** — sales tax / VAT line item present and right\n- **Total** matches what you intended\n- **Payment link** in the email preview (if online payment ON)\n\nIf anything's off — **Edit** before the customer pays.",
      next: 'record-payment',
    },
    {
      id: 'record-payment',
      label: 'Payment',
      title: 'Record customer payment',
      body: 'When customer pays:\n\n**+ New** → **Receive payment** → pick customer → QBO shows all open invoices.\n\n- Tick the invoice(s) being paid\n- **Payment method:** Cash / Check / Credit Card / ACH / Other\n- **Reference no** — check no, UTR, etc.\n- **Deposit to:** **Undeposited Funds** (if multiple payments will be deposited together) OR direct to bank account\n- **Amount received**\n\n**Save**.',
      callout: {
        kind: 'warning',
        text: "**Undeposited Funds** is QBO's killer feature — lets you batch multiple payments and reconcile against one bank deposit line. Use it for any client receiving multiple checks per day.",
      },
      check: {
        question: 'Payment recorded?',
        options: [
          { label: 'Yes — invoice marked Paid', next: 'sales-receipt' },
          { label: "Couldn't apply to invoice", next: 'fix-payment' },
        ],
      },
    },
    {
      id: 'fix-payment',
      title: "Couldn't apply to invoice",
      body: '1. **Wrong customer** — payment is on a different customer than the invoice\n2. **Already-applied payment** — the invoice already has a partial payment that needs editing first\n3. **Currency mismatch** — invoice in USD, payment recorded in GBP\n\nUndo + redo with the right customer / amount / currency.',
      check: {
        question: 'Fixed?',
        options: [
          { label: 'Yes', next: 'sales-receipt' },
          { label: 'No', next: 'flag-instructor' },
        ],
      },
    },
    {
      id: 'sales-receipt',
      label: 'Sales receipt',
      title: 'Sales receipts (for instant payments)',
      body: 'When a customer pays at the moment of sale (retail, e-comm), use **Sales Receipt** instead of Invoice → Payment:\n\n**+ New** → **Sales Receipt**.\n\n- Items + qty + rate + tax\n- **Payment method**\n- **Deposit to**\n\nOne voucher records the sale + the cash received. Used for cash sales, e-commerce orders, paid-on-delivery.',
      next: 'done',
    },
    {
      id: 'flag-instructor',
      title: 'Ask your instructor',
      body: 'Sales workflow edge cases (recurring billing, partial invoicing, multi-currency) deserve hands-on training. Bring sample customer agreements + an exported customer list to your next class.',
      terminal: true,
    },
    {
      id: 'done',
      title: 'Sales side complete',
      body: "You've now covered the entire QBO sales workflow. Practice tip: book 5 invoices to mixed customer types — domestic taxable, out-of-state, international, services, products — to lock the rules.\n\n**Next:** the **Expenses** guide for vendors + bills.",
      terminal: true,
    },
  ],
}
