import type { Guide } from '../types'

export const TALLY_COST_CENTRES: Guide = {
  slug: 'tally-prime-cost-centres',
  title: 'Cost centres in Tally — track by branch, project, or department',
  subtitle: 'Slice your P&L by anything you care about, without creating a hundred ledgers',
  hook: "When the boss asks 'how profitable is the Mumbai branch?' or 'what did Project Phoenix actually cost?' — cost centres are how you answer in 30 seconds without re-keying anything.",
  market: 'both',
  family: 'tally-prime',
  estimatedMinutes: 20,
  emoji: '🎯',
  color: 'success',
  prerequisites: ['Tally company set up', 'Some voucher data already booked'],
  outcomes: [
    'Cost categories + cost centres created (e.g. Branch / Project / Department)',
    'Vouchers tagged to the right cost centre on the fly',
    'Cost-centre-wise P&L pulled in seconds',
    'Pre-defined cost centre allocations for repeating expenses',
  ],
  startStepId: 'enable',
  steps: [
    {
      id: 'enable',
      label: 'Enable',
      title: 'Turn on cost centres',
      body: 'F11 → **Accounting Features**.\n\n- **Maintain cost centres:** Yes\n- **More than ONE cost category:** Yes (if you want to slice by both Branch AND Project)\n- **Use pre-defined cost centre allocations:** Yes (saves time on recurring vouchers)\n\n**Ctrl + A** to save.',
      callout: {
        kind: 'tip',
        text: 'Categories are dimensions; cost centres are values within each. Example: Category=*Branch* → Mumbai/Delhi/Cochin. Category=*Project* → Phoenix/Apollo/Atlas.',
      },
      next: 'create-category',
    },
    {
      id: 'create-category',
      label: 'Categories',
      title: 'Create cost categories',
      body: 'Gateway → **Create** → **Cost Category**.\n\nExample categories:\n- *Branch* — Mumbai, Delhi, Cochin\n- *Project* — Phoenix, Apollo, Atlas\n- *Department* — Sales, Operations, Admin\n\nCreate one category per dimension you care about. **Ctrl + A** to save each.',
      next: 'create-cc',
    },
    {
      id: 'create-cc',
      label: 'Cost centres',
      title: 'Create cost centres',
      body: 'Gateway → **Create** → **Cost Centre**.\n\n- **Name:** *Mumbai*\n- **Under:** Primary (or another cost centre for sub-tracking)\n- **Category:** *Branch*\n\nRepeat for each: Delhi, Cochin under Branch. Then Phoenix, Apollo, Atlas under Project.\n\nYou can nest cost centres for sub-totals (e.g. *Mumbai → Mumbai-Andheri*, *Mumbai-BKC*).',
      check: {
        question: 'Cost centres set up?',
        options: [
          { label: 'Yes', next: 'tag-voucher' },
          { label: 'Got error', next: 'flag-instructor' },
        ],
      },
    },
    {
      id: 'tag-voucher',
      label: 'Tag voucher',
      title: 'Tag a voucher to a cost centre',
      body: 'Book any voucher (Sales, Purchase, Payment) as usual. After entering the ledger amount, Tally pops up a **Cost Centre Allocation** screen:\n\n- Pick the category → pick the cost centre\n- Enter the amount (or % to split)\n\nExample: ₹50,000 rent → 60% Mumbai branch, 40% Delhi branch.\n\nAlt + C inside the allocation screen lets you create a new cost centre on the fly.',
      callout: {
        kind: 'warning',
        text: 'Cost centre allocation is per-line, not per-voucher. A single voucher can hit multiple cost centres if you split.',
      },
      check: {
        question: 'Voucher tagged?',
        options: [
          { label: 'Yes', next: 'predefined' },
          { label: 'CC screen not popping up', next: 'fix-no-cc' },
        ],
      },
    },
    {
      id: 'fix-no-cc',
      title: 'Cost centre screen not appearing',
      body: '1. Ledger has **Cost Centres Applicable: Yes**? — Alter the ledger\n2. F11 → Cost Centres still On?\n3. F12 in voucher screen → "Show cost centre details" toggled On',
      check: {
        question: 'Working now?',
        options: [
          { label: 'Yes', next: 'predefined' },
          { label: 'No', next: 'flag-instructor' },
        ],
      },
    },
    {
      id: 'predefined',
      label: 'Pre-defined',
      title: 'Pre-defined allocations (save time)',
      body: 'For ledgers that ALWAYS split the same way (e.g. *Office Rent* always 60/40 Mumbai/Delhi):\n\nGateway → **Alter** → **Ledger** → *Office Rent* → enable **Use pre-defined allocations** → set Mumbai 60%, Delhi 40%.\n\nFrom now on, every voucher hitting that ledger auto-allocates without asking.',
      callout: {
        kind: 'tip',
        text: 'Quarterly review: re-look at pre-defined splits. Branch sizes change, projects end — stale allocations distort the P&L.',
      },
      next: 'reports',
    },
    {
      id: 'reports',
      label: 'Reports',
      title: 'Cost-centre reports',
      body: 'Display → **Statements of Accounts** → **Cost Centres**.\n\n- **Category Summary** — total by category\n- **Cost Centre Summary** — net P&L per cost centre\n- **Cost Centre Break-up** — every voucher hit on a single cost centre\n- **Group Summary** — slice expenses by ledger + cost centre\n\nMost-used: **Cost Centre Summary** for monthly branch / project profitability.',
      callout: {
        kind: 'success',
        text: 'Run Cost Centre Summary at month-end and email each branch manager their own P&L. Suddenly everyone owns their numbers.',
      },
      next: 'done',
    },
    {
      id: 'flag-instructor',
      title: 'Ask your instructor',
      body: "Cost-centre design is a strategy decision, not a Tally one. Bring your firm's structure (branches/projects/departments) to your next class — your instructor will help you design the right categories.",
      terminal: true,
    },
    {
      id: 'done',
      title: 'Cost centres mastered',
      body: "You can now answer 'how profitable is X?' for any X your firm cares about. This is the skill that turns junior accountants into management accountants.\n\n**Next:** **Payroll** for employee salaries, or **Multi-currency** if you have foreign clients.",
      terminal: true,
    },
  ],
}
