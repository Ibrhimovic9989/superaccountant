import type { Guide } from '../types'

export const ZOHO_GST_SETUP: Guide = {
  slug: 'zoho-books-gst-setup',
  title: 'GST setup deep-dive in Zoho Books',
  subtitle: 'Tax rates, HSN, place of supply, e-invoicing toggles',
  hook: "Get the GST plumbing right once and Zoho will do the right thing on every invoice automatically. Skip this and you'll fix bugs for the rest of the year.",
  market: 'both',
  family: 'zoho-books',
  estimatedMinutes: 20,
  emoji: '🧾',
  color: 'warning',
  prerequisites: ['Zoho Books organization created with GSTIN configured'],
  outcomes: [
    'Default tax rates set (5%, 12%, 18%, 28%) with CGST/SGST/IGST splits',
    'HSN/SAC codes added to your top items',
    'Place of supply auto-detection verified',
    'E-invoicing enabled if turnover > ₹5 cr',
    'Composition scheme handled if applicable',
  ],
  startStepId: 'tax-rates',
  steps: [
    {
      id: 'tax-rates',
      label: 'Tax rates',
      title: 'Confirm default GST rates',
      body: "Settings → **Taxes** → **Tax Rates**. Zoho ships with all the standard GST slabs:\n\n- **GST 5%** → CGST 2.5% + SGST 2.5% intra / IGST 5% inter\n- **GST 12%** → CGST 6% + SGST 6% intra / IGST 12% inter\n- **GST 18%** → CGST 9% + SGST 9% intra / IGST 18% inter\n- **GST 28%** → CGST 14% + SGST 14% intra / IGST 28% inter\n- **Nil-rated** + **Exempt** + **Non-GST**\n\nReview and **make sure they're not edited** unless you have a reason.",
      video: {
        // Official Zoho Books channel — "Setting Up GST Details in Your Organisation"
        youtubeId: 'SXgqhJ-cjwI',
        caption: 'Zoho Books — Setting up GST for India',
      },
      callout: {
        kind: 'warning',
        text: "Don't delete or rename these. Every invoice template references them — breaking the rate breaks the templates.",
      },
      next: 'hsn-codes',
    },
    {
      id: 'hsn-codes',
      label: 'HSN codes',
      title: 'Add HSN/SAC codes to items',
      body: 'Items → pick an item → **Edit**.\n\n- **Goods** → HSN code (4/6/8 digits depending on turnover)\n- **Services** → SAC code (6 digits)\n- **Tax rate**: pick the right GST slab\n\nLookup HSN at **cbic-gst.gov.in/gst-goods-services-rates.html**.',
      callout: {
        kind: 'tip',
        text: 'Zoho lets you set a **default HSN** for an item category — saves time when adding new products in the same category.',
      },
      check: {
        question: 'HSN codes added to your top items?',
        options: [
          { label: 'Yes', next: 'place-of-supply' },
          { label: "Can't find HSN", next: 'fix-hsn' },
          { label: 'Skip — services only', next: 'place-of-supply' },
        ],
      },
    },
    {
      id: 'fix-hsn',
      title: 'Finding the right HSN',
      body: 'Use the search inside Zoho — start typing the product name in the HSN field and Zoho suggests matches.\n\nOr lookup at **cbic-gst.gov.in**.\n\nBased on annual turnover:\n- < ₹1.5 cr: HSN optional\n- ₹1.5–5 cr: 4-digit\n- ≥ ₹5 cr: 6-digit\n- Exports: 8-digit',
      check: {
        question: 'Got HSN now?',
        options: [
          { label: 'Yes', next: 'place-of-supply' },
          { label: 'Skip', next: 'place-of-supply' },
        ],
      },
    },
    {
      id: 'place-of-supply',
      label: 'Place of supply',
      title: 'Place of Supply auto-detection',
      body: "Zoho auto-picks Place of Supply (POS) based on the customer's billing address state.\n\n- **Your state = customer state** → CGST + SGST\n- **Different states** → IGST\n\nVerify by creating a draft invoice with two different customer states and checking the tax breakdown updates.",
      callout: {
        kind: 'warning',
        text: "If you ever need to override POS (e.g. delivery to a different state from billing), it's per-invoice in the Tax section. But the default is usually right.",
      },
      check: {
        question: 'POS detection working?',
        options: [
          { label: 'Yes', next: 'composition' },
          { label: 'Tax not splitting right', next: 'fix-pos' },
        ],
      },
    },
    {
      id: 'fix-pos',
      title: 'Place of Supply issue',
      body: '1. **Customer state wrong** — Contacts → pick customer → Edit → State must match the GSTIN state code\n2. **Your org state wrong** — Settings → Organization Profile → State\n3. **Customer GSTIN missing** — for B2B, GSTIN must be filled. Without GSTIN, Zoho treats them as B2C.',
      check: {
        question: 'Tax splitting correctly?',
        options: [
          { label: 'Yes', next: 'composition' },
          { label: 'No', next: 'flag-instructor' },
        ],
      },
    },
    {
      id: 'composition',
      label: 'Composition?',
      title: 'Composition scheme (if applicable)',
      body: "If your firm is on the **Composition Scheme** (annual turnover < ₹1.5 cr, simplified GST):\n\nSettings → **Taxes** → **GST Settings** → **Composition Scheme: Yes**.\n\nZoho switches the invoice template to **Bill of Supply** (Composition can't collect GST) and routes returns to **GSTR-4 (annual)** instead of GSTR-1/3B.\n\nIf you're a regular taxpayer, leave this **off**.",
      check: {
        question: 'Composition setting correct?',
        options: [
          { label: 'Yes', next: 'einvoicing' },
          { label: "Don't know", next: 'fix-composition' },
        ],
      },
    },
    {
      id: 'fix-composition',
      title: "Don't know if you're on Composition",
      body: 'Check your **GST Registration Certificate** — top of the certificate states the registration type. Or log into **gst.gov.in** → My Profile.\n\nThe scheme is opt-in — you must have applied for it. Default is Regular.',
      next: 'einvoicing',
    },
    {
      id: 'einvoicing',
      label: 'E-invoicing',
      title: 'E-invoicing (if turnover > ₹5 cr)',
      body: "Mandatory for businesses with annual turnover > **₹5 crore**.\n\nSettings → **Taxes** → **E-Invoicing** → **Enable**.\n\nYou'll need:\n- **API user credentials** from **einvoice1.gst.gov.in** (different from regular GST portal)\n- Once enabled, Zoho automatically gets an **IRN** (Invoice Reference Number) + **QR code** for every B2B invoice you create",
      callout: {
        kind: 'warning',
        text: 'Below ₹5 cr: do NOT enable e-invoicing. The portal will reject your IRN requests and break invoice creation.',
      },
      check: {
        question: 'E-invoicing setting correct for your turnover?',
        options: [
          { label: 'Yes', next: 'reverse-charge' },
          { label: 'Above ₹5 cr but skipped', next: 'fix-einvoicing' },
        ],
      },
    },
    {
      id: 'fix-einvoicing',
      title: 'E-invoicing — getting API access',
      body: "1. **einvoice1.gst.gov.in** → Sign up for **API access**\n2. Generate **API username + password** (different from your regular GST portal login)\n3. Whitelist Zoho's IPs (Zoho gives you the list)\n4. Plug credentials into Zoho settings\n5. Test on a draft invoice — first IRN takes ~10 sec",
      check: {
        question: 'E-invoicing working?',
        options: [
          { label: 'Yes', next: 'reverse-charge' },
          { label: 'Need help', next: 'flag-instructor' },
        ],
      },
    },
    {
      id: 'reverse-charge',
      label: 'RCM',
      title: 'Reverse Charge (RCM) configuration',
      body: 'For RCM purchases (where buyer pays GST):\n\nSettings → **Taxes** → **Tax Rates** → confirm RCM rates exist (5% RCM, 12% RCM, etc.)\n\nWhen creating a Bill from an unregistered supplier or notified RCM categories, pick the **RCM tax rate** instead of regular GST. Zoho handles the journal: creates GST liability + matching ITC.',
      callout: {
        kind: 'tip',
        text: 'Common RCM cases: legal fees, GTA (transport) services, security agency, sponsorship, services from unregistered suppliers above the limit.',
      },
      next: 'done',
    },
    {
      id: 'flag-instructor',
      title: 'Ask your instructor',
      body: 'GST setup is firm-specific. Bring your GST certificate, sample invoices, and Zoho org access to your next class.',
      terminal: true,
    },
    {
      id: 'done',
      title: 'GST plumbing done',
      body: 'Tax rates, HSN, POS, composition, e-invoicing — your org is now GST-aware. Zoho will do the right thing automatically on every invoice and bill.\n\n**Next:** the **First Invoice** guide — the most common workflow.',
      terminal: true,
    },
  ],
}
