import type { Guide } from '../types'

export const TALLY_REPORTS_BACKUP: Guide = {
  slug: 'tally-prime-reports-and-backup',
  title: 'Reports, year-end, and backup',
  subtitle: 'Reading P&L + Balance Sheet, closing the year, never losing data',
  hook: "If you can't read a Balance Sheet you can't be an accountant. This guide walks you through the four reports an accountant looks at every day — and the backup discipline that protects 5 years of work.",
  market: 'india',
  family: 'tally-prime',
  estimatedMinutes: 25,
  emoji: '📊',
  color: 'success',
  prerequisites: [
    'A company with at least a few months of voucher data',
    'External backup destination (USB drive, cloud folder, network share)',
  ],
  outcomes: [
    'Read P&L, Balance Sheet, Day Book, and Trial Balance comfortably',
    'Drill down from any report into the source voucher',
    'Year-end closing routine completed',
    'Automated backup configured + tested with a restore',
  ],
  startStepId: 'pick-report',
  steps: [
    {
      id: 'pick-report',
      label: 'Pick report',
      title: 'Which area do you want to learn?',
      body: 'Pick the closest:',
      check: {
        question: 'Choose:',
        options: [
          { label: 'Daily reports (P&L, Day Book, Outstandings)', next: 'pl' },
          { label: 'Balance Sheet (financial position)', next: 'balance-sheet' },
          { label: 'Year-end closing routine', next: 'year-end' },
          { label: 'Backup + restore', next: 'backup' },
        ],
      },
    },
    {
      id: 'pl',
      label: 'P&L',
      title: 'Profit & Loss A/c',
      body: 'Gateway → **Profit & Loss A/c** (or press **D** then **P**).\n\n**Left side (Expenses):**\n- Direct expenses (cost of goods)\n- Indirect expenses (operating costs)\n- Net Profit (balancing figure)\n\n**Right side (Income):**\n- Sales accounts\n- Indirect income (rent received, interest, etc.)\n\n**Useful keys:**\n- **F2** — change period\n- **Alt + F1** — drill into detail\n- **F12** — toggle gross/net view, decimals, etc.',
      callout: {
        kind: 'tip',
        text: 'Click any line to drill down. Click again to drill deeper — eventually into the actual voucher. Master this and you can audit any number on any report in 30 seconds.',
      },
      check: {
        question: 'P&L makes sense?',
        options: [
          { label: 'Yes', next: 'day-book' },
          { label: 'Net profit looks wrong', next: 'fix-pl' },
        ],
      },
    },
    {
      id: 'fix-pl',
      title: 'Net profit looks wrong',
      body: "Common causes:\n\n1. **Cost ledger in wrong group** — e.g. *Marketing Expenses* booked under *Indirect Income* by mistake. Drill into both sides to find it.\n2. **Provisional vs final** — in F12 toggle 'Show with closing stock' if you keep inventory\n3. **Period mismatch** — F2 to set correct date range",
      check: {
        question: 'P&L right now?',
        options: [
          { label: 'Yes', next: 'day-book' },
          { label: 'No', next: 'flag-instructor' },
        ],
      },
    },
    {
      id: 'day-book',
      label: 'Day Book',
      title: 'Day Book — every entry of the day',
      body: 'Display More Reports → **Day Book** (or just **D + B**).\n\nLists every voucher booked, in chronological order. Filter by:\n- Voucher type (Sales / Purchase / etc.) — press **F4**\n- Date range — **F2**\n- Specific ledger — **Alt + F12** (Range)\n\nUse the Day Book at end-of-day to scan for typos before they become permanent.',
      next: 'outstandings',
    },
    {
      id: 'outstandings',
      label: 'Outstandings',
      title: 'Outstandings — who owes you, who you owe',
      body: "Display → **Statements of Accounts** → **Outstandings** → **Receivables** (or **Payables**).\n\n**Receivables** — every customer with an open balance, showing each unpaid invoice and how many days it's overdue.\n\n**Payables** — every supplier you owe, with the same breakdown.\n\n**Aging analysis:** F6 toggles age buckets (0-30, 31-60, 61-90, > 90). Anything over 60 days = chase the customer or write off.",
      callout: {
        kind: 'tip',
        text: 'The Outstandings report is your daily collections call list. Print it weekly and work the phone — it pays for itself.',
      },
      next: 'trial-balance',
    },
    {
      id: 'trial-balance',
      label: 'Trial Balance',
      title: 'Trial Balance — does it tally?',
      body: "Gateway → **Trial Balance** (or **D + T**).\n\nLists every ledger with its closing balance, separated into Debit and Credit columns. The two columns **must match** — if they don't, you've broken double-entry somewhere.\n\nAt year-end, the Trial Balance feeds directly into the Balance Sheet and P&L — it's the foundational report.",
      next: 'balance-sheet',
    },
    {
      id: 'balance-sheet',
      label: 'Balance Sheet',
      title: 'Balance Sheet — financial position',
      body: "Gateway → **Balance Sheet** (or **D + B**).\n\n**Liabilities side:**\n- Capital Account\n- Loans (Liability)\n- Current Liabilities (creditors, taxes payable)\n\n**Assets side:**\n- Fixed Assets\n- Investments\n- Current Assets (debtors, stock, cash, bank)\n\nThe two sides **must equal**. If they don't, your books have an error.",
      callout: {
        kind: 'warning',
        text: "If Balance Sheet doesn't balance, you've usually got a one-sided journal entry somewhere. Use **Audit Reports** (Display → Audit) to find it.",
      },
      check: {
        question: 'Balance Sheet balances?',
        options: [
          { label: 'Yes', next: 'year-end' },
          { label: "Doesn't balance", next: 'fix-bs' },
        ],
      },
    },
    {
      id: 'fix-bs',
      title: "Balance Sheet doesn't balance",
      body: "1. Run Display → **Audit** → **Suspect Vouchers** — Tally flags one-sided entries\n2. Check **opening balances** — typo in opening capital is a classic mistake\n3. **Provisional balance issue** — F12 in BS, toggle 'Show with current period closing stock'\n\nIf still off after these, your books need a deeper audit — get your instructor.",
      check: {
        question: 'Balanced now?',
        options: [
          { label: 'Yes', next: 'year-end' },
          { label: 'No', next: 'flag-instructor' },
        ],
      },
    },
    {
      id: 'year-end',
      label: 'Year-end',
      title: 'Year-end closing routine',
      body: 'On 31 March (or your fiscal year-end), complete this routine:\n\n1. **Reconcile all bank accounts** — every Tally entry should match a bank-statement line\n2. **Clear suspense accounts** — Suspense ledger should be zero\n3. **Run Trial Balance** — debits must equal credits\n4. **Run Balance Sheet** — must balance\n5. **Stock physical verification** — count actual inventory, post adjustment vouchers for shortages/excess\n6. **Provisions** — book year-end provisions (depreciation, taxes, audit fees, etc.)\n7. **Audit trail check** — Display → Exception Reports → Audit Trail\n8. **Backup** before any year-end edits\n9. **Carry forward balances** — Tally does this automatically when you create the new financial year\n\nGateway → **Alt + K** → **Create** → **Period 1-Apr-2027 to 31-Mar-2028**.',
      callout: {
        kind: 'warning',
        text: "Don't change vouchers from the prior year after closing. If you must, your auditor needs to know — and it should go through a board resolution.",
      },
      check: {
        question: 'Year-end checklist done?',
        options: [
          { label: 'Yes', next: 'backup' },
          { label: 'Skip — mid-year', next: 'backup' },
        ],
      },
    },
    {
      id: 'backup',
      label: 'Backup',
      title: 'Backup your Tally data',
      body: 'Tally stores everything in **C:\\Users\\Public\\Tally Data\\<company-id>\\**. To back up:\n\nGateway → **Alt + K** (Company) → **Backup**.\n\n- **Source:** your company\n- **Destination:** an external drive, cloud sync folder (OneDrive / Google Drive), or network share — **NEVER the same hard drive**\n\nTally creates a single `.tbk` file. Save it with date in the filename: *AcmeCo_2026-04-29.tbk*.',
      callout: {
        kind: 'warning',
        text: "Daily backups for active books. Weekly is the bare minimum. A hard drive failure with no backup = years of work lost. Don't be that person.",
      },
      check: {
        question: 'Backup completed?',
        options: [
          { label: 'Yes', next: 'restore-test' },
          { label: 'Backup failed', next: 'fix-backup' },
        ],
      },
    },
    {
      id: 'fix-backup',
      title: 'Backup failed',
      body: '- **Destination not writable** — make sure the drive is plugged in and unlocked\n- **Antivirus blocking** — temporarily disable while backing up\n- **Tally data corruption** — Gateway → **Alt + K** → **Repair** first, then backup\n- **Insufficient permissions** — run Tally as administrator',
      check: {
        question: 'Backup working?',
        options: [
          { label: 'Yes', next: 'restore-test' },
          { label: 'No', next: 'flag-instructor' },
        ],
      },
    },
    {
      id: 'restore-test',
      label: 'Restore test',
      title: 'Test the restore (do this once)',
      body: "A backup you've never restored is a backup you don't have.\n\nTo test: create a new dummy company on a different folder, then **Alt + K** → **Restore** → pick your `.tbk` → confirm. Verify the data is all there.\n\nDelete the dummy company afterwards. Now you know your backup actually works.",
      next: 'done',
    },
    {
      id: 'flag-instructor',
      title: 'Ask your instructor',
      body: 'Reports + year-end issues often need an audit-trained eye. Bring your screen recording or the actual file to your next class — your instructor will spot it.',
      terminal: true,
    },
    {
      id: 'done',
      title: 'You now run Tally end-to-end',
      body: "Across these guides you've covered the entire accounting workflow:\n\n- ✅ Install + setup + masters\n- ✅ Sales + purchase + banking\n- ✅ GST returns + TDS\n- ✅ Reports + year-end + backup\n\nThis is what an entry-level accountant in India is hired to do. Practice on a dummy company for 30 days and you'll be faster than 80% of working accountants.",
      callout: {
        kind: 'success',
        text: "When you start a real job, the first day you book a sales voucher confidently and reconcile a bank statement — you'll feel it. That's the goal.",
      },
      terminal: true,
    },
  ],
}
