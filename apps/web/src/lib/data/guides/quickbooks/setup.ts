import type { Guide } from '../types'

export const QBO_SETUP: Guide = {
  slug: 'quickbooks-online-setup',
  title: 'Set up QuickBooks Online',
  subtitle: 'Sign up, configure your company, and prepare for your first invoice',
  hook: "QuickBooks Online (QBO) is the default for US, UK, Canada, Australia, and outsourced accounting work. If you're working for international clients out of India, this is the tool.",
  market: 'both',
  family: 'quickbooks-online',
  estimatedMinutes: 15,
  emoji: '📘',
  color: 'accent',
  prerequisites: [
    'A working email address',
    "The client's country (drives tax + chart-of-accounts defaults)",
    'A QuickBooks Online subscription (Simple Start / Essentials / Plus / Advanced)',
  ],
  outcomes: [
    'QBO account created with the right country edition',
    'Company profile filled (name, address, fiscal year, tax basis)',
    'Chart of accounts customized for the client',
    'Sales tax / VAT / GST configured',
    'First user role assigned',
  ],
  startStepId: 'sign-up',
  steps: [
    {
      id: 'sign-up',
      label: 'Sign up',
      title: 'Sign up for QuickBooks Online',
      body: "Go to **quickbooks.intuit.com** → pick the **country edition** matching your client (US / UK / CA / AU / Global).\n\nFor outsourced India-based bookkeeping work, you'll typically use the **client's country edition**, not India.\n\nPick a plan:\n- **Simple Start** — $35/mo (US) — single user, no inventory\n- **Essentials** — $65/mo — 3 users, bills + multi-currency\n- **Plus** — $99/mo — 5 users, inventory, projects, classes/locations\n- **Advanced** — $235/mo — 25 users, batch invoicing, custom roles\n\nMost SMBs use **Plus**. Sign up + verify email.",
      callout: {
        kind: 'warning',
        text: 'QuickBooks Online India was discontinued in **April 2023**. Use Tally Prime / Zoho Books for Indian businesses. QBO is for international clients only.',
      },
      check: {
        question: 'Account created?',
        options: [
          { label: 'Yes', next: 'company' },
          { label: 'Wrong country edition', next: 'fix-country' },
        ],
      },
    },
    {
      id: 'fix-country',
      title: 'Wrong country edition',
      body: "Each country edition has different tax, banking, and report localizations. You can't convert one edition to another.\n\nFix: cancel the wrong subscription → sign up fresh on the right URL:\n- **US:** quickbooks.intuit.com\n- **UK:** quickbooks.intuit.com/uk\n- **CA:** quickbooks.intuit.com/ca\n- **AU:** quickbooks.intuit.com/au\n\nIf billing started, contact Intuit support for a refund.",
      check: {
        question: 'Right edition now?',
        options: [
          { label: 'Yes', next: 'company' },
          { label: 'Need help', next: 'flag-instructor' },
        ],
      },
    },
    {
      id: 'company',
      label: 'Company',
      title: 'Set up company profile',
      body: '**Settings (gear)** → **Account and Settings** → **Company** tab.\n\n- **Company name** (legal name)\n- **Email** (where customer emails come from)\n- **Phone** + **Website**\n- **Address** (registered + shipping)\n- **EIN / VAT number / ABN** (tax registration ID)\n- **Logo** — upload PNG, appears on invoices\n\n**Save**.',
      next: 'fiscal',
    },
    {
      id: 'fiscal',
      label: 'Fiscal year',
      title: 'Fiscal year + accounting basis',
      body: 'Settings → Account and Settings → **Advanced**.\n\n- **First month of fiscal year:** January (US calendar) / April (UK) / July (AU) / October (CA)\n- **Accounting method:** Accrual (most clients) / Cash (small biz only)\n- **Close the books:** set the lockdown date after each year-end audit\n\n**Save**.',
      callout: {
        kind: 'warning',
        text: "Once accounting method is set and there's transaction data, switching is painful. Confirm with the client's accountant before changing.",
      },
      next: 'sales-tax',
    },
    {
      id: 'sales-tax',
      label: 'Sales tax',
      title: 'Configure sales tax / VAT / GST',
      body: '**Taxes** → **Sales tax** (US) / **VAT** (UK) / **GST/HST** (CA) / **GST** (AU).\n\nUS:\n- **Set up sales tax** → enter the states where the client has nexus\n- QBO auto-fetches the rates\n- Enable **automatic sales tax** for invoices to auto-calc the right rate by ship-to address\n\nUK / EU:\n- VAT registration number → standard rate (20% UK) → MTD-compliant filing if applicable\n\nCanada:\n- GST/HST + PST per province\n\nAustralia:\n- GST 10% + ABN on invoices',
      callout: {
        kind: 'tip',
        text: "US automatic sales tax is a killer feature — handles every state's rate via ship-to address. Don't try to manually maintain rates.",
      },
      next: 'coa',
    },
    {
      id: 'coa',
      label: 'COA',
      title: 'Customize the Chart of Accounts',
      body: "Accounting → **Chart of Accounts**. QBO ships with a default COA per country.\n\nReview each account:\n- **Add** industry-specific accounts (e.g. for SaaS: *Subscription Revenue*, *Stripe Fees*)\n- **Mark inactive** accounts you won't use\n- **Sub-accounts** for granular reporting (e.g. *Marketing → Google Ads / Meta Ads / SEO*)\n- **Numbering** — turn on Account Numbers for COA discipline\n\nDon't over-engineer — start with the defaults + 5-10 client-specific additions.",
      next: 'users',
    },
    {
      id: 'users',
      label: 'Users',
      title: 'Invite team + accountant',
      body: "**Settings** → **Manage Users** → **Add User**.\n\nRoles:\n- **Standard user** — full access\n- **Limited user** — sales only / vendors only\n- **Reports only** — read-only reports\n- **Time tracking only** — for staff who only log hours\n\nThe **Accountant** role (separate tab → Invite Accountant) is **free + unlimited** — invite the client's CPA / your firm. They get a special **Accountant Toolbox** with adjusting journals, reclassify, undo reconciliation.",
      callout: {
        kind: 'tip',
        text: 'Always invite the accountant first — sets the tone that you want clean books. Free seats and gives them their tooling.',
      },
      next: 'done',
    },
    {
      id: 'flag-instructor',
      title: 'Ask your instructor',
      body: "QBO setup edge cases (multi-entity, multi-currency, multi-class) need an experienced eye. Bring the client's previous trial balance + tax registration certs to your next class.",
      terminal: true,
    },
    {
      id: 'done',
      title: 'Company live',
      body: 'Your QBO company is configured. Pick the next guide:\n\n- **Sales workflow** — customers, products, invoices\n- **Expenses** — vendors, bills, expense entry\n- **Banking** — connect bank, reconcile\n- **Reports** — P&L, BS, sales tax filing prep',
      terminal: true,
    },
  ],
}
