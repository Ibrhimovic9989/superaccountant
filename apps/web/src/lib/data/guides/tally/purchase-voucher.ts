import type { Guide } from '../types'

export const TALLY_PURCHASE_VOUCHER: Guide = {
  slug: 'tally-prime-purchase-voucher',
  title: 'Record purchase vouchers in Tally',
  subtitle: 'Cash purchase, credit purchase, RCM, debit notes — all covered',
  hook: "The mirror-image of sales. Master both and you can close 90% of an SME's books.",
  market: 'india',
  family: 'tally-prime',
  estimatedMinutes: 20,
  emoji: '🧾',
  color: 'success',
  prerequisites: [
    'Masters set up — supplier ledgers, purchase ledger, stock items',
    'Sales voucher guide completed (the workflow is similar)',
  ],
  outcomes: [
    'Cash and credit purchase vouchers booked',
    'GST input credit auto-recorded for ITC claim',
    'Reverse Charge Mechanism (RCM) purchase entered',
    'Debit note (purchase return) processed',
  ],
  startStepId: 'pick-type',
  steps: [
    {
      id: 'pick-type',
      label: 'Pick type',
      title: 'What kind of purchase?',
      body: 'Pick the closest scenario:',
      check: {
        question: 'Choose:',
        options: [
          { label: 'Credit purchase from a registered supplier', next: 'credit-purchase' },
          { label: 'Cash purchase (paid on the spot)', next: 'cash-purchase' },
          { label: 'Reverse Charge purchase (RCM)', next: 'rcm-purchase' },
          { label: 'Purchase return / debit note', next: 'purchase-return' },
        ],
      },
    },
    {
      id: 'credit-purchase',
      label: 'Credit purchase',
      title: 'Record a credit purchase',
      body: "Gateway → **Vouchers** → **F9 (Purchase)**.\n\n- **Date:** today\n- **Supplier invoice no:** the number on supplier's tax invoice (NOT your own running number)\n- **Date:** date on supplier's invoice\n- **Party A/c name:** *Bharat Suppliers*\n- **Purchase ledger:** *Purchase — Goods*\n- **Stock item, qty, rate**\n- **GST** auto-records ITC\n\nIn **Bill-wise**: New Ref, supplier's invoice number, due date.\n\n**Ctrl + A** to save.",
      callout: {
        kind: 'warning',
        text: "Always enter the **supplier's invoice number**, not your own. GSTR-2B reconciliation matches on supplier invoice number — get it wrong and the ITC won't reconcile.",
      },
      check: {
        question: 'Purchase saved?',
        options: [
          { label: 'Yes', next: 'verify' },
          { label: "Tally won't accept supplier inv no", next: 'fix-supplier-inv' },
        ],
      },
    },
    {
      id: 'fix-supplier-inv',
      title: 'Supplier invoice number issue',
      body: 'Tally sometimes complains because the same supplier invoice number was already used in another voucher. Each (supplier, invoice no) pair must be unique.\n\nFix: append a slash + month, e.g. *INV-001/Apr* if you genuinely have a duplicate. Or check Day Book to find the existing duplicate and delete one.',
      check: {
        question: 'Saved now?',
        options: [
          { label: 'Yes', next: 'verify' },
          { label: 'No', next: 'flag-instructor' },
        ],
      },
    },
    {
      id: 'cash-purchase',
      label: 'Cash purchase',
      title: 'Record a cash purchase',
      body: 'Same as credit purchase but **Party A/c name = Cash**. Skip the bill-wise step (no party balance to track).\n\n- **F9 (Purchase)** → date → supplier invoice number → **Party: Cash** → purchase ledger → item, qty, rate → save.',
      check: {
        question: 'Saved?',
        options: [
          { label: 'Yes', next: 'verify' },
          { label: 'GST not capturing', next: 'fix-itc' },
        ],
      },
    },
    {
      id: 'rcm-purchase',
      label: 'RCM',
      title: 'Reverse Charge (RCM) purchase',
      body: 'RCM = the **buyer pays GST**, not the seller. Common cases:\n\n- Goods/services from an unregistered supplier\n- Specific notified categories (legal services, GTA, etc.)\n\n**Setup:** the purchase ledger must have **"Reverse Charge Applicable: Yes"**. Check via Alter → Ledger.\n\nVoucher: F9 (Purchase) → fill as usual → Tally creates a **GST liability** in your books equal to the GST on the purchase.',
      callout: {
        kind: 'warning',
        text: 'Under RCM, you pay the GST in cash (not from ITC pool) when filing GSTR-3B. Then claim it as ITC in the same return. Net cash impact: zero — but you must show both legs.',
      },
      check: {
        question: 'RCM voucher saved with the right liability?',
        options: [
          { label: 'Yes', next: 'verify' },
          { label: 'No GST liability showing', next: 'fix-rcm' },
        ],
      },
    },
    {
      id: 'fix-rcm',
      title: "RCM didn't trigger",
      body: '1. **Purchase ledger:** Alter → set "Reverse Charge Applicable: Yes"\n2. **Supplier ledger:** if unregistered, set Registration Type: **Unregistered**\n3. **F11:** confirm RCM is enabled in GST features\n\nThen redo the voucher.',
      check: {
        question: 'RCM working now?',
        options: [
          { label: 'Yes', next: 'verify' },
          { label: 'No', next: 'flag-instructor' },
        ],
      },
    },
    {
      id: 'purchase-return',
      label: 'Purchase return',
      title: 'Purchase return (debit note)',
      body: 'When you return goods to a supplier:\n\nGateway → **Vouchers** → **Alt + F5 (Debit Note)**.\n\n- **Party:** supplier ledger\n- **Purchase ledger:** same as original purchase\n- **Stock item, qty, rate** of returned goods\n- **GST** auto-reverses\n\n**Ctrl + A** to save.',
      callout: {
        kind: 'tip',
        text: "Reference the supplier's original invoice number in the narration. Comes up in GSTR-2B reconciliation later.",
      },
      check: {
        question: 'Debit note saved?',
        options: [
          { label: 'Yes', next: 'verify' },
          { label: 'Shortcut not working', next: 'fix-debit-note' },
        ],
      },
    },
    {
      id: 'fix-debit-note',
      title: 'Debit note shortcut',
      body: "F11 → 'Use Debit/Credit Notes': **Yes** → save. Or in the voucher screen press **F10** to pick from all voucher types.",
      check: {
        question: 'Working now?',
        options: [
          { label: 'Yes', next: 'verify' },
          { label: 'No', next: 'flag-instructor' },
        ],
      },
    },
    {
      id: 'fix-itc',
      title: 'ITC not capturing',
      body: '1. Purchase ledger has GST rate set?\n2. Stock item has GST rate set?\n3. Supplier ledger has GSTIN + Registration Type: Regular?\n\nFix all three, then redo the voucher.',
      check: {
        question: 'ITC showing now?',
        options: [
          { label: 'Yes', next: 'verify' },
          { label: 'No', next: 'flag-instructor' },
        ],
      },
    },
    {
      id: 'verify',
      label: 'Verify',
      title: 'Verify the purchase',
      body: 'Three checks:\n\n1. **Day Book** — voucher visible\n2. **GSTR-2 preview** — Display → GST Reports → GSTR-2 — your purchase shows under B2B/RCM as applicable\n3. **Supplier ledger** — Display → Account Books → Ledger → pick supplier — outstanding balance updated',
      check: {
        question: 'All three look right?',
        options: [
          { label: 'Yes', next: 'done' },
          { label: 'Missing somewhere', next: 'flag-instructor' },
        ],
      },
    },
    {
      id: 'flag-instructor',
      title: 'Ask your instructor',
      body: 'Take screenshots of the failing voucher + supplier ledger + purchase ledger. Your instructor will pinpoint the mismatch in 30 seconds.',
      terminal: true,
    },
    {
      id: 'done',
      title: 'Purchase mastered',
      body: "Together with sales, you've now covered the two voucher types that drive 80% of bookkeeping. Next up: **Banking** for payments + receipts + reconciliation.",
      terminal: true,
    },
  ],
}
