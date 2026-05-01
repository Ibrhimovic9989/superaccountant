import type { Guide } from '../types'

export const ZOHO_RECURRING: Guide = {
  slug: 'zoho-books-recurring-invoices',
  title: 'Recurring invoices + auto-collection in Zoho',
  subtitle: 'Set up subscription billing once, never invoice the same customer twice',
  hook: 'If you bill the same customer the same amount on the same day every month, you should never touch the keyboard for it. Zoho automates the whole loop — invoice, email, payment.',
  market: 'both',
  family: 'zoho-books',
  estimatedMinutes: 15,
  emoji: '🔁',
  color: 'accent',
  prerequisites: [
    'At least one customer + one item created',
    'For auto-collection: a Zoho-supported payment gateway connected (Razorpay, Stripe, etc.)',
  ],
  outcomes: [
    'Recurring invoice profile created — invoices auto-issue on schedule',
    'Auto-email + payment link enabled',
    'Customer card-on-file set up for true auto-collection (optional)',
    'Pause / resume / cancel workflow understood',
  ],
  startStepId: 'use-case',
  steps: [
    {
      id: 'use-case',
      label: 'Use case',
      title: 'What are you automating?',
      body: 'Pick the closest:',
      check: {
        question: 'Choose:',
        options: [
          { label: 'Monthly subscription / retainer', next: 'create-recurring' },
          { label: 'Annual contract billed monthly', next: 'create-recurring' },
          { label: 'Quarterly fees', next: 'create-recurring' },
          { label: 'One-off complex invoice (use templates instead)', next: 'use-templates' },
        ],
      },
    },
    {
      id: 'use-templates',
      title: 'Use invoice templates instead',
      body: 'For one-off but repeatable invoices, **templates** are better than recurring profiles.\n\nSettings → **Invoices** → **Templates** → save common items / terms as a template. Apply to a new invoice in one click.',
      terminal: true,
    },
    {
      id: 'create-recurring',
      label: 'Create profile',
      title: 'Create the recurring profile',
      body: '**Sales** → **Recurring Invoices** → **+ New**.\n\n- **Profile name:** *Acme Monthly Retainer* (internal name)\n- **Customer:** pick\n- **Frequency:** Monthly / Quarterly / Yearly / Custom\n- **Start date:** when first invoice goes out\n- **Never expires** OR **Ends after N invoices** OR **End date**\n- **Item table:** same as a regular invoice — items, qty, rate, GST\n- **Payment terms** + **invoice notes**\n\n**Save**.',
      video: {
        youtubeId: 'FhnpHlzZuTg',
        caption: 'Create recurring invoices in Zoho Books — full guide',
      },
      callout: {
        kind: 'tip',
        text: "If billing date varies (e.g. 5th of every month, but skip if it's a Sunday), use **Custom** frequency with explicit dates.",
      },
      check: {
        question: 'Profile created?',
        options: [
          { label: 'Yes', next: 'auto-email' },
          { label: 'Got error', next: 'flag-instructor' },
        ],
      },
    },
    {
      id: 'auto-email',
      label: 'Auto-email',
      title: 'Auto-email on issue',
      body: 'In the recurring profile → **More options** → **Auto-email**.\n\n- **To**: customer + cc accountant + cc you\n- **Subject + body**: standard "Your monthly invoice from {{org_name}}" works fine\n- **Attach invoice as PDF**\n- **Include payment link** if a payment gateway is connected\n\nFrom now on Zoho emails the invoice the moment it auto-issues.',
      next: 'auto-collection',
    },
    {
      id: 'auto-collection',
      label: 'Auto-collection',
      title: 'Auto-collection (optional but powerful)',
      body: "**True automation** — customer's card / mandate is on file, Zoho auto-charges them when each invoice issues.\n\nSetup:\n\n1. **Settings → Online Payments** → connect **Razorpay** / **Stripe**\n2. On the recurring profile → **Auto-charge: On**\n3. Customer must authorize once via a Zoho-issued link → enters card / sets up UPI mandate\n\nFrom then on, every recurring invoice **auto-pays itself**. The customer never sees an invoice unless something fails.",
      callout: {
        kind: 'warning',
        text: "Auto-charge requires customer consent (RBI rule). Don't enable it without their written authorization — both for compliance and trust.",
      },
      check: {
        question: 'Auto-collection set up (or skipped)?',
        options: [
          { label: 'Set up', next: 'verify' },
          { label: 'Skipped — manual payments are fine', next: 'verify' },
        ],
      },
    },
    {
      id: 'verify',
      label: 'Verify',
      title: 'Verify the next-issue date',
      body: 'On the recurring profile, you should see:\n\n- **Status:** Active\n- **Next invoice on:** the date Zoho will auto-create the next invoice\n\nIf "Next invoice on" looks right, you\'re good. From now on, Zoho handles it.',
      next: 'manage',
    },
    {
      id: 'manage',
      label: 'Manage',
      title: 'Pause / resume / cancel',
      body: 'On the recurring profile:\n\n- **Pause** — stops auto-issuing without losing the profile. Use during a customer dispute or billing hold.\n- **Resume** — restarts from where you left off, or skips missed dates depending on settings\n- **Stop** — ends permanently. Past invoices remain.\n\nEdit at any time → next invoice picks up the changes.',
      callout: {
        kind: 'tip',
        text: "For a customer who renews annually with a price change, **edit the profile** before the next renewal date — don't cancel + re-create. Keeps history clean.",
      },
      next: 'done',
    },
    {
      id: 'flag-instructor',
      title: 'Ask your instructor',
      body: 'Recurring profiles + auto-collection often involve payment gateway setup quirks. Bring screenshots of any error and your gateway dashboard.',
      terminal: true,
    },
    {
      id: 'done',
      title: 'Recurring sorted',
      body: "You've now automated the most boring part of bookkeeping. Apply this to every customer who pays you the same amount on the same day each month and you'll save hours every month.\n\n**Next:** the **GST Returns** guide for filing GSTR-1 + 3B straight from Zoho.",
      terminal: true,
    },
  ],
}
