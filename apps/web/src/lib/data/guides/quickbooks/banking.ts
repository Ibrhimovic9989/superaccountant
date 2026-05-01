import type { Guide } from '../types'

export const QBO_BANKING: Guide = {
  slug: 'quickbooks-online-banking',
  title: 'Banking + reconciliation in QuickBooks Online',
  subtitle: 'Connect bank, auto-categorize, match transactions, reconcile monthly',
  hook: "QBO's bank feed is its strongest feature. Connect once, every transaction lands in QBO daily, and machine-learning categorization gets faster the more you use it. Reconciliation becomes a 5-min job.",
  market: 'both',
  family: 'quickbooks-online',
  estimatedMinutes: 25,
  emoji: '🏦',
  color: 'success',
  prerequisites: ['QBO company set up', 'Active business bank account with online banking'],
  outcomes: [
    'Bank account connected via Plaid / Yodlee feed',
    'Bank rules created for repeating categorizations',
    'Transactions matched to invoices / bills',
    'Monthly reconciliation completed against bank statement',
    'Discrepancies investigated + resolved',
  ],
  startStepId: 'connect',
  steps: [
    {
      id: 'connect',
      label: 'Connect',
      title: 'Connect your bank',
      body: '**Banking** → **Connect Account** → search bank.\n\nQBO uses **Plaid** (US) / **Yodlee** (Global) under the hood.\n\n- Search bank name → click logo\n- Redirected to bank login (via Plaid/Yodlee)\n- Enter online banking credentials\n- Approve any 2FA / OTP\n- Pick which accounts to import (checking, savings, credit cards)\n- Pick **start date** for transaction history (default: 90 days back)\n\nFirst sync: 5-10 min. After that, daily auto-sync.',
      callout: {
        kind: 'warning',
        text: 'Plaid/Yodlee uses your read-only credentials — never used to make payments. But still: use a **dedicated banking user with read-only privileges** if your bank supports it.',
      },
      check: {
        question: 'Bank connected + transactions appearing?',
        options: [
          { label: 'Yes', next: 'categorize' },
          { label: 'Login failed', next: 'fix-login' },
          { label: 'Bank not in the list', next: 'fix-no-bank' },
        ],
      },
    },
    {
      id: 'fix-login',
      title: 'Bank login failed',
      body: '1. **Wrong credentials** — log into bank directly first to confirm\n2. **2FA blocking** — Plaid asks for OTP; check your phone\n3. **App-only bank** (some neobanks like Mercury) — log into bank web first to set up password access, then retry\n4. **Account locked** — too many attempts → reset via bank',
      check: {
        question: 'Connected now?',
        options: [
          { label: 'Yes', next: 'categorize' },
          { label: 'No — fall back to upload', next: 'upload' },
        ],
      },
    },
    {
      id: 'fix-no-bank',
      title: 'Bank not supported',
      body: "Plaid covers > 12,000 US institutions. If yours isn't listed, fallback options:\n\n1. **Upload statement** — download CSV / QFX / OFX from bank's portal → upload to QBO via Banking → Upload from file\n2. **Manual entry** — for low-volume accounts\n3. **Petty cash** — use a Manual Cash account inside QBO",
      next: 'upload',
    },
    {
      id: 'upload',
      label: 'Upload',
      title: 'Upload bank statement (manual)',
      body: 'Banking → **Upload from file** → pick bank → upload CSV / QFX / OFX.\n\nMap columns: Date, Description, Amount.\n\nQBO parses transactions and lands them in the For Review queue (next step).',
      next: 'categorize',
    },
    {
      id: 'categorize',
      label: 'Categorize',
      title: 'Categorize transactions in For Review',
      body: "**Banking** → bank account → **For Review** tab.\n\nFor each transaction:\n\n- **Add** — categorize new (pick account + tax + payee)\n- **Match** — link to an existing invoice / bill / payment that QBO suggests (smart matching)\n- **Transfer** — when it's movement between your own accounts (don't double-count)\n- **Exclude** — for transactions that don't belong (refund, error, personal)\n\nQBO learns: after 5-10 manually-categorized \"Uber\" entries, it auto-suggests *Travel* on every future Uber.",
      callout: {
        kind: 'tip',
        text: "**Match** is the key word. If QBO finds a matching invoice / bill, click Match instead of Add — it links them so you don't double-record the income / expense.",
      },
      check: {
        question: 'Transactions categorized?',
        options: [
          { label: 'Yes', next: 'rules' },
          { label: 'Unsure on a transaction', next: 'fix-unsure' },
        ],
      },
    },
    {
      id: 'fix-unsure',
      title: 'Unknown transaction',
      body: '1. **Read the description carefully** — bank descriptions are cryptic. Match the merchant name to known vendors.\n2. **Check transaction page on bank side** — sometimes the bank\'s own portal has more detail\n3. **Ask the client** — "what is this $X transaction?" — better than guessing\n4. **Park to Suspense** — if truly unknown, categorize as *Ask My Accountant* (QBO has a dedicated account for this), investigate later',
      next: 'rules',
    },
    {
      id: 'rules',
      label: 'Rules',
      title: 'Bank Rules — automate categorization',
      body: '**Banking** → **Rules** → **New rule**.\n\nFor any pattern:\n- **If** description **contains** "STARBUCKS"\n- **Set:** Category = *Meals & Entertainment*, Tax = Non-taxable, Payee = Starbucks\n- **Auto-add** (apply automatically) OR **For Review** (suggest only)\n\nBuild rules for top 20 vendors. After that, your For Review queue drops to ~5 mins / week.',
      callout: {
        kind: 'tip',
        text: "Don't auto-add until you've watched the rule for a week. Auto-add the wrong rule and your books fill with miscategorized junk.",
      },
      next: 'reconcile',
    },
    {
      id: 'reconcile',
      label: 'Reconcile',
      title: 'Monthly reconciliation',
      body: "**Settings (gear)** → **Reconcile**.\n\n- **Account** — pick the bank account\n- **Statement ending date** — last day of month\n- **Statement ending balance** — copy from bank statement PDF\n\nQBO shows two columns: Deposits vs Withdrawals. Tick each transaction that's on your bank statement.\n\nWhen ticked transactions match the statement balance, the **difference is $0** — reconciled. Click **Finish now**.\n\nIf difference ≠ 0 — investigate.",
      callout: {
        kind: 'success',
        text: 'Reconciling monthly = audit-ready books. Reconciling yearly = a forensic nightmare. Make it a non-negotiable monthly habit.',
      },
      check: {
        question: 'Reconciled?',
        options: [
          { label: 'Yes', next: 'done' },
          { label: 'Difference ≠ 0', next: 'fix-diff' },
        ],
      },
    },
    {
      id: 'fix-diff',
      title: 'Reconciliation difference',
      body: "Investigate in this order:\n\n1. **Missing in QBO** — bank shows a charge you didn't book. Add it (interest, bank fee, etc.).\n2. **Missing in bank** — outstanding cheques you issued. Leave un-ticked → they'll clear next month.\n3. **Wrong amount** — typo in QBO vs bank. Edit the QBO transaction.\n4. **Duplicate** — same transaction entered twice. Delete one.\n5. **Wrong date** — transaction dated outside the period. Fix date.\n\nRe-check after each fix.",
      check: {
        question: 'Difference resolved?',
        options: [
          { label: 'Yes — reconciled!', next: 'done' },
          { label: 'Still off', next: 'flag-instructor' },
        ],
      },
    },
    {
      id: 'flag-instructor',
      title: 'Ask your instructor',
      body: 'Reconciliation issues get hairy fast. Take a copy of the bank statement + QBO Reconcile screen + Recent Activity to your next class.',
      terminal: true,
    },
    {
      id: 'done',
      title: 'Banking on autopilot',
      body: 'Connect once, rules for the top 20, weekly 5-min review, monthly reconciliation. This is the rhythm of clean books.\n\n**Next:** the **Reports** guide for P&L drilldowns + sales tax filing prep.',
      terminal: true,
    },
  ],
}
