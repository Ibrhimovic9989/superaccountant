import type { Guide } from '../types'

export const ZOHO_PROJECTS: Guide = {
  slug: 'zoho-books-projects',
  title: 'Projects + time tracking + billing in Zoho',
  subtitle:
    'For consultants, agencies, and service firms — track hours, bill them, see project profitability',
  hook: 'If your firm sells time (consulting, design, dev, accounting services), this is how you turn timesheets into invoices into a profitability report — all in one tool.',
  market: 'both',
  family: 'zoho-books',
  estimatedMinutes: 25,
  emoji: '⏱️',
  color: 'accent',
  prerequisites: ['Zoho Books org set up', 'At least one customer + one staff user'],
  outcomes: [
    'A project created with budget + billing method',
    'Tasks defined with hourly rates',
    'Time logged via timer or manual entry',
    'Hours billed via auto-generated invoice',
    'Project profitability report read',
  ],
  startStepId: 'enable',
  steps: [
    {
      id: 'enable',
      label: 'Enable',
      title: 'Turn on projects',
      body: '**Settings** → **Preferences** → **Projects** → **Enable**.\n\nAdds a top-level **Projects** module + adds **Project + Task** dropdowns to invoice / expense / timesheet screens.',
      next: 'create-project',
    },
    {
      id: 'create-project',
      label: 'Create project',
      title: 'Create your first project',
      body: "**Projects** → **+ New**.\n\n- **Project name:** *Acme Website Redesign*\n- **Customer**\n- **Billing method:**\n  - **Fixed cost** — total project price agreed upfront\n  - **Based on project hours** — hours × project hourly rate\n  - **Based on staff hours** — hours × each staff member's hourly rate\n  - **Based on task hours** — hours × each task's hourly rate (most flexible)\n- **Budget:** total hours OR total amount\n- **Description**\n\n**Save**.",
      callout: {
        kind: 'tip',
        text: '**Based on task hours** is the most flexible — different rates for design vs dev vs PM work on the same project. Use it unless you have a strong reason not to.',
      },
      check: {
        question: 'Project created?',
        options: [
          { label: 'Yes', next: 'tasks' },
          { label: 'Not sure on billing method', next: 'fix-billing' },
        ],
      },
    },
    {
      id: 'fix-billing',
      title: 'Picking a billing method',
      body: "**Pick fixed-cost** when:\n- Client wants a guaranteed price\n- Scope is clear and small\n\n**Pick task-hours** when:\n- Different rates per skill (designer ₹1,500/hr, developer ₹2,500/hr, PM ₹3,000/hr)\n- Open-ended scope\n\n**Pick project-hours** when:\n- Single rate for whole team (₹2,000/hr blended)\n\nIf you change later, Zoho lets you, but it's a hassle.",
      next: 'tasks',
    },
    {
      id: 'tasks',
      label: 'Tasks',
      title: 'Define project tasks',
      body: 'Inside the project → **Tasks** tab → **+ New**.\n\n- **Task name:** *UX Wireframes*\n- **Description**\n- **Estimated hours**\n- **Billing rate** (only if billing = task-hours)\n- **Assign to** staff member\n\nRepeat for each task: *Visual Design*, *Frontend Dev*, *Backend Integration*, *QA*, *PM*.\n\n**Save**.',
      next: 'log-time',
    },
    {
      id: 'log-time',
      label: 'Log time',
      title: 'Log timesheet entries',
      body: '**Time Tracking** → **Log Time** (or use the **Timer** button to track real-time).\n\n- **Project + Task**\n- **Date**\n- **Duration** (or start the timer and stop when done)\n- **Notes** — what was actually done (visible to client on invoice if you check the box)\n- **Billable?** Yes (default)\n\n**Save**.',
      callout: {
        kind: 'tip',
        text: 'Mobile app: timer in your pocket. Client meeting? Tap start, tap stop. Notes via voice → text. Logging at end-of-week is when accuracy dies.',
      },
      check: {
        question: 'Time logged?',
        options: [
          { label: 'Yes', next: 'review' },
          { label: 'Timer not visible', next: 'fix-timer' },
        ],
      },
    },
    {
      id: 'fix-timer',
      title: 'Timer not visible',
      body: 'Timer needs your account in **Time Tracking** mode. Settings → Users & Roles → confirm the staff user has **Timesheet** permission.\n\nMobile app: install **Zoho Books** mobile (iOS / Android) — timer is on the home screen.',
      next: 'review',
    },
    {
      id: 'review',
      label: 'Review',
      title: 'Review hours before invoicing',
      body: "Inside project → **Time Logs** tab.\n\n- Filter: **Unbilled**\n- Review each entry — typos in qty / wrong task allocations distort the invoice\n- **Approve** entries (admin step) before they're bill-ready\n\nThis is your last chance to catch mistakes — once on the invoice, only credit notes can fix.",
      next: 'invoice',
    },
    {
      id: 'invoice',
      label: 'Invoice',
      title: 'Convert hours to an invoice',
      body: 'Project → **+ Invoice** → Zoho proposes:\n\n- All unbilled hours, grouped by task\n- Hourly rate × hours = line item value\n- Optional: include detailed time entries (date + notes) for transparency\n\nReview → **Save and Send**. Zoho marks those time entries as **Billed**.',
      callout: {
        kind: 'warning',
        text: "Always include detailed time entries on the first invoice — sets expectation. Drop them later if the client doesn't ask.",
      },
      next: 'profitability',
    },
    {
      id: 'profitability',
      label: 'Profitability',
      title: 'Project profitability report',
      body: 'Reports → **Projects** → **Project Profitability**.\n\nShows per project:\n- **Revenue** (invoiced from this project)\n- **Cost** (project-tagged expenses + staff cost based on hours × cost rate)\n- **Profit margin %**\n\nUse this monthly to:\n- Identify unprofitable clients (margin < 30% on services)\n- See which staff are most efficient\n- Adjust pricing on the next contract',
      callout: {
        kind: 'tip',
        text: 'Set a **staff cost rate** (Settings → Users → Cost Rate). Without it, the report only shows revenue side.',
      },
      next: 'done',
    },
    {
      id: 'flag-instructor',
      title: 'Ask your instructor',
      body: "Project setup is highly firm-specific. Bring a sample contract + your firm's current billing rates to your next class — your instructor will help you map it.",
      terminal: true,
    },
    {
      id: 'done',
      title: 'Projects sorted',
      body: 'From here: log time as you work, invoice when ready, review profitability monthly. This is the workflow that lets a service firm scale beyond owner-as-bottleneck.\n\n**Next:** the **Reports** guide for the full management dashboard.',
      terminal: true,
    },
  ],
}
