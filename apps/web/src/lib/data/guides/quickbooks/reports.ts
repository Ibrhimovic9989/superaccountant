import type { Guide } from '../types'

export const QBO_REPORTS: Guide = {
  slug: 'quickbooks-online-reports',
  title: 'Reports + sales tax filing in QuickBooks Online',
  subtitle: 'P&L, BS, Cash Flow, AR/AP aging — plus sales tax / VAT / GST returns',
  hook: "Reports separate accountants from clerks. This guide covers the daily-use reports + how to use QBO's automated sales tax / VAT / GST filing for the major country editions.",
  market: 'both',
  family: 'quickbooks-online',
  estimatedMinutes: 25,
  emoji: '📊',
  color: 'warning',
  prerequisites: ['QBO with at least a few months of transaction data'],
  outcomes: [
    'P&L + BS + Cash Flow read with comparative periods',
    'AR/AP aging reports for collections + payables management',
    'Sales tax / VAT / GST liability report generated',
    "Tax return filed via QBO's e-file (where supported)",
    'Custom reports saved + auto-emailed to stakeholders',
  ],
  startStepId: 'overview',
  steps: [
    {
      id: 'overview',
      label: 'Overview',
      title: 'QBO Reports overview',
      body: '**Reports** has four main groups:\n\n- **Standard** — pre-built reports (P&L, BS, AR Aging, etc.)\n- **Custom Reports** — your saved customizations\n- **Management Reports** — packaged report sets (P&L + BS + Cash Flow combined)\n- **Reports for My Accountant** — adjusting journal, reclassify, audit log\n\nAll reports can be filtered by date, customer, vendor, class, location, project.',
      next: 'pl',
    },
    {
      id: 'pl',
      label: 'P&L',
      title: 'Profit & Loss',
      body: '**Reports** → **Profit and Loss**.\n\nKey controls:\n- **Report period** — pick or use This Month / Last Month / This Year\n- **Compare** — Previous period / Same period last year — adds a 2nd column\n- **Display columns by** — Total / Months / Customers / Class / Location / Project — splits the P&L into named columns\n\n**Click any number** → drills to the source transactions → click again → drills to the actual invoice / bill.',
      callout: {
        kind: 'tip',
        text: 'Compare to **Same period last year** AND **Previous period** in two separate runs — different stories. YoY shows growth; vs prior month shows trend. Both matter.',
      },
      next: 'bs',
    },
    {
      id: 'bs',
      label: 'BS',
      title: 'Balance Sheet',
      body: '**Reports** → **Balance Sheet**.\n\n- **As of date** — point-in-time\n- **Compare** — prior date\n- **Display by** — Class / Location\n\nReview each line monthly:\n- Cash → reconciled?\n- A/R → aged report tied?\n- Inventory → physical count tied?\n- Fixed assets → depreciation booked?\n- A/P → aged report tied?',
      next: 'cash-flow',
    },
    {
      id: 'cash-flow',
      label: 'Cash Flow',
      title: 'Statement of Cash Flows',
      body: "**Reports** → **Statement of Cash Flows**.\n\nThree sections:\n- **Operating** — net income + working capital changes\n- **Investing** — fixed asset purchases / sales\n- **Financing** — loans + equity\n\nNet of three = change in cash + bank balances. If not, there's a journal somewhere not flowing.",
      callout: {
        kind: 'warning',
        text: "Profitable but cash-poor? Operating cash flow is the answer. Run this every month — P&L can lie, cash flow can't.",
      },
      next: 'ar-ap',
    },
    {
      id: 'ar-ap',
      label: 'AR / AP',
      title: 'A/R + A/P aging',
      body: '**Reports** → **A/R Aging Detail** + **A/P Aging Detail**.\n\nBuckets: Current / 1-30 / 31-60 / 61-90 / >90.\n\n- **A/R Aging:** weekly collections call list — anyone in 60+ gets a call, anyone in 90+ gets escalated\n- **A/P Aging:** weekly pay run — anyone due this week, prioritize early-discount opportunities\n\nThese two reports drive the most cash-flow improvement of any report.',
      callout: {
        kind: 'tip',
        text: 'Send A/R Aging to founder + sales head every Monday morning. Visibility = collection. Quietly tucked-away aging = years-old write-offs.',
      },
      next: 'sales-tax',
    },
    {
      id: 'sales-tax',
      label: 'Sales tax',
      title: 'Sales tax / VAT / GST liability',
      body: "**Taxes** → **Sales tax** (US) / **VAT** (UK) / **GST** (CA / AU).\n\nQBO auto-tracks every taxable sale + recoverable input tax → shows current period liability.\n\n**Per country edition:**\n- **US:** **Automated Sales Tax** — auto-calculates per-state, files via Intuit's partners (or export for state portals)\n- **UK:** **MTD-compliant VAT** — file directly to HMRC from QBO with one click\n- **CA:** GST/HST + PST — calculated per province + auto-fills CRA forms\n- **AU:** GST + BAS lodgement — file directly to ATO",
      callout: {
        kind: 'success',
        text: 'UK MTD + AU BAS lodgement happen INSIDE QBO — one click, return filed. Among the biggest productivity wins of QBO over manual.',
      },
      check: {
        question: 'Sales tax / VAT report reviewed?',
        options: [
          { label: 'Yes', next: 'file-tax' },
          { label: 'Numbers look off', next: 'fix-tax' },
        ],
      },
    },
    {
      id: 'fix-tax',
      title: 'Tax numbers off',
      body: '1. **Customer ship-to addresses** — wrong addresses skew US sales tax. Fix customer records.\n2. **Item tax codes** — Taxable / Non-taxable misset on products.\n3. **Adjustments not caught** — credit notes, refunds may not have flowed correctly. Drill into the period.\n4. **Bank transactions miscategorized** — purchases with recoverable VAT booked without VAT.\n\nFix at source — never override the tax return manually.',
      check: {
        question: 'Numbers right now?',
        options: [
          { label: 'Yes', next: 'file-tax' },
          { label: 'Still off', next: 'flag-instructor' },
        ],
      },
    },
    {
      id: 'file-tax',
      label: 'File tax',
      title: 'File the return',
      body: "**UK / AU / CA paths** (in-app filing supported):\n\n1. Taxes → **Prepare return** for the period\n2. Review → **Mark as filed** OR **Submit to HMRC / ATO / CRA**\n3. QBO records the payment account when you settle\n\n**US path:**\n1. Run **Sales Tax Liability Report** for the period\n2. Use **Automated Sales Tax → Pay** if subscribed to QBO Payroll's sales tax filing, OR export → file via state portal manually\n\n**India path:** N/A — QBO India was discontinued; use Tally / Zoho.",
      next: 'custom',
    },
    {
      id: 'custom',
      label: 'Custom',
      title: 'Custom reports + scheduling',
      body: 'Most reports → **Customize** (top-right) → set filters → **Save customization** → name it.\n\n**Schedule** any saved customization to email recipients on a schedule:\n- Daily / Weekly / Monthly\n- PDF or Excel\n- Multiple recipients\n\nGood defaults to schedule:\n- **P&L** weekly to founder\n- **A/R Aging** weekly Monday morning\n- **Bank balance** daily to founder',
      next: 'audit',
    },
    {
      id: 'audit',
      label: 'Audit log',
      title: 'Audit Log (every change ever)',
      body: 'Reports → **Audit Log**.\n\nLogs every create / edit / delete / login / report run by every user. Filter by user, date, transaction type.\n\n**Use cases:**\n- Investigating a discrepancy ("when did this number change?")\n- Reviewing a new bookkeeper\'s work\n- Forensic audits\n\nQBO can\'t be edited without a trail. Auditors love this.',
      next: 'done',
    },
    {
      id: 'flag-instructor',
      title: 'Ask your instructor',
      body: "Reporting + tax filing edge cases (multi-state US, MTD UK, BAS AU) are jurisdiction-specific. Bring your client's tax registration certs + recent filings to your next class.",
      terminal: true,
    },
    {
      id: 'done',
      title: 'QBO mastered',
      body: "Across these guides you've covered:\n\n- ✅ Setup + COA + tax\n- ✅ Sales workflow (customers / estimates / invoices / payments)\n- ✅ Expenses (vendors / bills / pay run)\n- ✅ Banking (auto-feed / rules / reconcile)\n- ✅ Reports + sales tax filing\n\nThis is what an outsourced bookkeeper for US / UK / CA / AU clients needs to be hireable. Practice on a sandbox company for 30 days and you'll be faster than 80% of mid-level bookkeepers.",
      callout: {
        kind: 'success',
        text: 'Get a free QBO **sandbox** at developer.intuit.com → Sign in → Sandboxes. Practice without burning real client data.',
      },
      terminal: true,
    },
  ],
}
