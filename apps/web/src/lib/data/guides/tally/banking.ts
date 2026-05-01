import type { Guide } from '../types'

export const TALLY_BANKING: Guide = {
  slug: 'tally-prime-banking',
  title: 'Banking in Tally — payments, receipts, reconciliation',
  subtitle: 'Pay suppliers, receive from customers, match Tally to your bank statement',
  hook: 'Banking errors are the #1 reason audits go sideways. This guide covers every cash flow workflow plus the monthly reconciliation that catches them.',
  market: 'india',
  family: 'tally-prime',
  estimatedMinutes: 25,
  emoji: '🏦',
  color: 'accent',
  prerequisites: [
    'Bank ledger created with IFSC + account number',
    'Customer + supplier ledgers with bill-by-bill enabled',
  ],
  outcomes: [
    'Payment voucher booked against an open supplier bill',
    'Receipt voucher booked against an open customer invoice',
    'Contra entry for cash deposits / withdrawals',
    'Bank Reconciliation Statement matched to a real bank statement',
  ],
  startStepId: 'pick-action',
  steps: [
    {
      id: 'pick-action',
      label: 'Pick action',
      title: 'What banking action are you doing?',
      body: 'Pick the closest:',
      check: {
        question: 'Choose:',
        options: [
          { label: 'Paying a supplier', next: 'payment' },
          { label: 'Receiving from a customer', next: 'receipt' },
          { label: 'Bank to bank / cash deposit', next: 'contra' },
          { label: 'Monthly reconciliation', next: 'recon' },
        ],
      },
    },
    {
      id: 'payment',
      label: 'Payment',
      title: 'Make a supplier payment',
      body: "Gateway → **Vouchers** → **F5 (Payment)**.\n\n- **Date:** payment date\n- **Account:** *HDFC Bank — 0123* (or Cash for cash payments)\n- **Particulars:** supplier ledger (e.g. *Bharat Suppliers*)\n- **Amount:** payment amount\n\nIn **Bill-wise Details**:\n- **Type of Ref:** Agst Ref → pick the open invoice\n- Tally auto-knocks off the invoice from the supplier's outstanding\n\n**Ctrl + A** to save.",
      callout: {
        kind: 'warning',
        text: "Always use **Agst Ref** to match against an open bill. **New Ref** creates an advance payment that won't auto-clear when the next purchase comes in.",
      },
      check: {
        question: 'Payment saved with the right invoice match?',
        options: [
          { label: 'Yes', next: 'verify-payment' },
          { label: 'No bills shown to match against', next: 'fix-no-bills' },
        ],
      },
    },
    {
      id: 'fix-no-bills',
      title: 'No open bills to match',
      body: "Means the supplier ledger doesn't have **bill-by-bill** turned on, so Tally has no bill references to match against.\n\nFix: **Alter** → **Ledger** → supplier → **Maintain balances bill-by-bill: Yes** → save → re-do the payment voucher.\n\nIf the supplier had old vouchers without bill refs, you may need to clean them up first — bring this to your instructor.",
      check: {
        question: 'Bills appearing now?',
        options: [
          { label: 'Yes', next: 'verify-payment' },
          { label: 'No', next: 'flag-instructor' },
        ],
      },
    },
    {
      id: 'verify-payment',
      title: 'Verify the payment',
      body: '1. Display → Account Books → Ledger → pick supplier — outstanding decreased\n2. Display → Account Books → Bank Books → pick bank — payment shows as a debit\n\nIf both look right, payment is fully booked.',
      next: 'recon-prompt',
    },
    {
      id: 'receipt',
      label: 'Receipt',
      title: 'Record a customer receipt',
      body: 'Gateway → **Vouchers** → **F6 (Receipt)**.\n\n- **Date:** receipt date\n- **Account:** *HDFC Bank — 0123* (or Cash)\n- **Particulars:** customer ledger\n- **Amount:** receipt amount\n\n**Bill-wise:** Agst Ref → pick the invoice the customer is paying.\n\n**Ctrl + A** to save.',
      callout: {
        kind: 'tip',
        text: 'If the customer paid an exact invoice amount, matching is one click. If they paid a round number that covers multiple bills, Tally lets you split the receipt across bills.',
      },
      check: {
        question: 'Receipt saved + invoice cleared?',
        options: [
          { label: 'Yes', next: 'verify-receipt' },
          { label: 'Customer paid more than the invoice', next: 'fix-overpay' },
        ],
      },
    },
    {
      id: 'fix-overpay',
      title: 'Customer paid extra (advance)',
      body: 'Split the receipt:\n\n1. First line in Bill-wise: Agst Ref → pick the invoice for its full amount\n2. Second line: New Ref → name it *Advance* → for the surplus\n\nThe advance sits as a credit on the customer ledger and auto-clears against the next invoice you raise.',
      check: {
        question: 'Receipt saved with advance?',
        options: [
          { label: 'Yes', next: 'verify-receipt' },
          { label: 'Confused', next: 'flag-instructor' },
        ],
      },
    },
    {
      id: 'verify-receipt',
      title: 'Verify the receipt',
      body: '1. Customer ledger — outstanding decreased (or zero)\n2. Bank Book — receipt shows as a credit',
      next: 'recon-prompt',
    },
    {
      id: 'contra',
      label: 'Contra',
      title: 'Contra entry (cash ↔ bank or bank ↔ bank)',
      body: 'Use **F4 (Contra)** for any movement between cash and bank or between two bank accounts. Examples: depositing cash into bank, withdrawing cash, transferring between two of your bank accounts.\n\n- **F4 (Contra)**\n- **Account:** the account being debited (where money goes)\n- **Particulars:** the account being credited (where money came from)\n- **Amount**\n\n**Ctrl + A** to save.',
      callout: {
        kind: 'tip',
        text: 'No GST or party involved in contra entries — they only move money between your own accounts.',
      },
      check: {
        question: 'Contra saved?',
        options: [
          { label: 'Yes', next: 'recon-prompt' },
          { label: 'Got error', next: 'flag-instructor' },
        ],
      },
    },
    {
      id: 'recon-prompt',
      label: 'Recon?',
      title: 'Want to reconcile now?',
      body: "Bank reconciliation matches Tally entries against your actual bank statement. Most firms do it monthly. If you have a bank statement handy, let's reconcile now.",
      check: {
        question: 'Reconcile now?',
        options: [
          { label: 'Yes', next: 'recon' },
          { label: 'Skip — single voucher only', next: 'done' },
        ],
      },
    },
    {
      id: 'recon',
      label: 'Reconcile',
      title: 'Bank Reconciliation Statement',
      body: "Display → **Account Books** → **Cash/Bank Book** → pick your bank → press **F5 (Reconcile)**.\n\nYou'll see two columns:\n- **Tally entries** (your books)\n- **Bank date** (empty — you fill it in)\n\nFor each entry that *cleared* on your bank statement, type the date it cleared. For entries not yet cleared, leave the bank date blank — they're your **outstanding** items.",
      callout: {
        kind: 'tip',
        text: "Once all matched entries have a bank date, the **closing balance** at the bottom of the screen should equal your bank statement's closing balance. If not — investigate.",
      },
      check: {
        question: 'Closing balance matches your statement?',
        options: [
          { label: 'Yes — fully reconciled!', next: 'done' },
          { label: "Doesn't match", next: 'fix-mismatch' },
        ],
      },
    },
    {
      id: 'fix-mismatch',
      title: 'Bank vs Tally mismatch',
      body: "Investigate in this order:\n\n1. **Missing entries in Tally** — bank shows a charge or interest you didn't book? Add a Payment / Receipt voucher.\n2. **Missing entries on bank** — cheque you issued hasn't cleared yet? Leave it as outstanding.\n3. **Wrong amount** — typo in Tally vs bank statement? Alter the voucher.\n4. **Bank charges** — book to *Bank Charges* under Indirect Expenses.\n5. **Interest received** — book to *Interest Received* under Indirect Income.\n\nRepeat the reconciliation after each fix.",
      check: {
        question: 'Reconciled now?',
        options: [
          { label: 'Yes', next: 'done' },
          { label: 'Still off', next: 'flag-instructor' },
        ],
      },
    },
    {
      id: 'flag-instructor',
      title: 'Bring it to your instructor',
      body: 'Banking issues often need eyes-on. Take a copy of your bank statement + screenshots of the Tally Bank Book. Your instructor will spot the mismatch.',
      terminal: true,
    },
    {
      id: 'done',
      title: 'Banking sorted',
      body: "You've covered every banking workflow that comes up in a real Indian SME's books. Make reconciling a monthly habit and your closing balance will always match.\n\n**Next:** the **GST Returns** guide, where we file GSTR-1 directly from this Tally data.",
      terminal: true,
    },
  ],
}
