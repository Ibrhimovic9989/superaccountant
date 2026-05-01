import type { Guide } from '../types'

export const TALLY_GST_RETURNS: Guide = {
  slug: 'tally-prime-gst-returns',
  title: 'File GST returns from Tally',
  subtitle: 'GSTR-1, GSTR-3B, GSTR-2B reconciliation — all from your Tally data',
  hook: 'Filing GST returns by hand from spreadsheets is error-prone and slow. Tally generates them straight from your vouchers — this guide walks you through GSTR-1 and GSTR-3B end-to-end.',
  market: 'india',
  family: 'tally-prime',
  estimatedMinutes: 30,
  emoji: '📤',
  color: 'warning',
  prerequisites: [
    'Sales + purchase vouchers booked for the month',
    'GSTIN configured in F11',
    'GST portal credentials handy (username + password)',
  ],
  outcomes: [
    'GSTR-1 generated and exported as JSON for the GST portal',
    'GSTR-2B downloaded and reconciled against Tally purchases',
    'GSTR-3B generated with the right tax liability + ITC values',
    'Common reconciliation mismatches identified and fixed',
  ],
  startStepId: 'pick-return',
  steps: [
    {
      id: 'pick-return',
      label: 'Pick return',
      title: 'Which return do you need to file?',
      body: "Pick the one due. We'll route accordingly.",
      check: {
        question: 'Choose:',
        options: [
          { label: 'GSTR-1 (outward sales) — due 11th of next month', next: 'gstr1-preview' },
          { label: 'GSTR-3B (summary return) — due 20th', next: 'gstr3b-preview' },
          { label: 'GSTR-2B reconciliation (matching ITC)', next: 'gstr2b-download' },
        ],
      },
    },
    {
      id: 'gstr1-preview',
      label: 'GSTR-1 preview',
      title: 'Preview GSTR-1 in Tally',
      body: "Gateway → **Display More Reports** → **GST Reports** → **GSTR-1**.\n\nSet period (F2) to the month you're filing. You'll see sections:\n\n- **B2B** — sales to registered customers (with GSTIN)\n- **B2C (Large)** — inter-state sales > ₹2.5L to unregistered\n- **B2C (Small)** — everything else to unregistered\n- **CDNR** — credit/debit notes to registered\n- **CDNUR** — credit/debit notes to unregistered\n- **Exports** + **Nil-rated** + **HSN summary**\n\nReview each section.",
      callout: {
        kind: 'warning',
        text: 'If any voucher shows under **"Incomplete/Mismatched information"**, fix it before exporting — these will be rejected by the portal.',
      },
      check: {
        question: 'GSTR-1 looks right with no mismatches?',
        options: [
          { label: 'Yes', next: 'gstr1-export' },
          { label: 'Has mismatches', next: 'fix-gstr1-mismatch' },
        ],
      },
    },
    {
      id: 'fix-gstr1-mismatch',
      title: 'Fix GSTR-1 mismatches',
      body: 'Most common causes:\n\n1. **Missing GSTIN on customer** — Alter customer ledger, fill GSTIN\n2. **Wrong state** — customer state ≠ GSTIN state code\n3. **No HSN on stock item** — Alter stock item, add HSN\n4. **Missing Place of Supply** — open the voucher, F12 to configure POS\n\nClick on the mismatch line in GSTR-1 — Tally drills down to the offending voucher.',
      check: {
        question: 'Mismatches resolved?',
        options: [
          { label: 'Yes', next: 'gstr1-export' },
          { label: 'Stuck', next: 'flag-instructor' },
        ],
      },
    },
    {
      id: 'gstr1-export',
      label: 'Export JSON',
      title: 'Export GSTR-1 as JSON',
      body: "In the GSTR-1 report screen, press **Alt + E (Export)** → **JSON (for GST portal)**.\n\nTally creates a JSON file in your configured export folder (default: **C:\\Users\\Public\\Tally Data**).\n\nNote the file name — you'll upload it to the GST portal next.",
      check: {
        question: 'JSON exported?',
        options: [
          { label: 'Yes — got the file', next: 'gstr1-upload' },
          { label: 'Export failed', next: 'fix-export' },
        ],
      },
    },
    {
      id: 'fix-export',
      title: 'JSON export failed',
      body: "Usually one of:\n\n- **Permissions** — Tally can't write to the folder. Run Tally as administrator.\n- **Mismatched vouchers** — go back and fix all mismatches first.\n- **No data** — check the period (F2) is set correctly.",
      check: {
        question: 'Export working?',
        options: [
          { label: 'Yes', next: 'gstr1-upload' },
          { label: 'No', next: 'flag-instructor' },
        ],
      },
    },
    {
      id: 'gstr1-upload',
      label: 'Upload',
      title: 'Upload to the GST portal',
      body: '1. Go to **gst.gov.in** → log in with your GSTIN credentials\n2. **Returns Dashboard** → pick the financial year + month\n3. Click **GSTR-1** → **Prepare Offline**\n4. **Choose File** → pick the JSON Tally exported → **Upload**\n5. Wait for processing (usually < 5 min)\n6. **View summary** to confirm all sections look right\n7. **Submit** → **File with DSC** or **EVC** (OTP)',
      callout: {
        kind: 'warning',
        text: "Once filed, GSTR-1 cannot be revised. Mistakes can only be fixed via amendments in the next month's return.",
      },
      check: {
        question: 'GSTR-1 filed successfully?',
        options: [
          { label: 'Yes — got ARN', next: 'done' },
          { label: 'Portal rejected', next: 'fix-portal-reject' },
        ],
      },
    },
    {
      id: 'fix-portal-reject',
      title: 'Portal rejected the upload',
      body: 'Common errors:\n\n- **"Invalid GSTIN"** — a customer GSTIN in your data is wrong. Click the error report → fix the offending customer ledger → re-export.\n- **"Duplicate invoice number"** — same invoice number used twice in the month. Fix in Tally → re-export.\n- **"Place of supply mismatch"** — POS state ≠ recipient GSTIN state. Fix in voucher → re-export.\n\nNever paste different data into the portal manually — always fix in Tally and re-export.',
      check: {
        question: 'Filed now?',
        options: [
          { label: 'Yes', next: 'done' },
          { label: 'Still rejected', next: 'flag-instructor' },
        ],
      },
    },
    {
      id: 'gstr2b-download',
      label: 'Download 2B',
      title: 'Download GSTR-2B from the portal',
      body: "GSTR-2B is auto-generated by the portal from suppliers' GSTR-1 filings — it's the source of truth for your ITC.\n\n1. **gst.gov.in** → **Returns Dashboard** → pick month\n2. Click **GSTR-2B** → **Download**\n3. Save the JSON file",
      next: 'gstr2b-import',
    },
    {
      id: 'gstr2b-import',
      label: 'Import 2B',
      title: 'Import GSTR-2B into Tally',
      body: "Gateway → **GST Reports** → **GSTR-2** → **Alt + O (Import GSTR-2B)** → pick the JSON file.\n\nTally compares your booked purchases against the GSTR-2B data and shows three tables:\n\n- **Matched** — Tally and 2B agree → claim ITC\n- **Mismatched** — amounts/numbers differ → investigate\n- **Available only in 2B** — supplier filed but you didn't book → ask supplier or book it\n- **Available only in Tally** — you booked but supplier hasn't filed → don't claim ITC yet",
      callout: {
        kind: 'warning',
        text: "Only the **Matched** column is safe to claim as ITC in GSTR-3B. Claiming ITC that's not in 2B = §16(2)(aa) violation = interest + penalty.",
      },
      check: {
        question: 'GSTR-2B imported and reconciled?',
        options: [
          { label: 'Yes', next: 'done' },
          { label: 'Lots of mismatches', next: 'fix-2b-mismatches' },
        ],
      },
    },
    {
      id: 'fix-2b-mismatches',
      title: 'GSTR-2B mismatches',
      body: "**Available only in 2B** — supplier filed something you didn't book. Either:\n- You actually didn't make this purchase → contact supplier, they file a wrong invoice\n- You made it but didn't book it in Tally → book the purchase voucher\n\n**Available only in Tally** — you booked it but supplier hasn't filed yet. Wait one cycle. Don't claim ITC until it appears in 2B.\n\n**Mismatched** — amount or invoice number differs. Compare side-by-side and fix whichever side is wrong.",
      check: {
        question: 'Mismatches resolved?',
        options: [
          { label: 'Yes', next: 'done' },
          { label: 'Need more help', next: 'flag-instructor' },
        ],
      },
    },
    {
      id: 'gstr3b-preview',
      label: 'GSTR-3B preview',
      title: 'Preview GSTR-3B in Tally',
      body: "Gateway → **GST Reports** → **GSTR-3B**.\n\nKey rows you'll see:\n\n- **3.1 Outward supplies** — your sales totals\n- **3.1(d) Inward supplies (RCM)** — RCM purchases\n- **4 Eligible ITC** — pulled from matched GSTR-2B\n- **5 Exempt + Nil + Non-GST**\n- **6 Payment of Tax** — auto-calculates net liability\n\nReview each row carefully.",
      check: {
        question: 'Numbers look right?',
        options: [
          { label: 'Yes', next: 'gstr3b-file' },
          { label: 'Liability looks wrong', next: 'fix-3b' },
        ],
      },
    },
    {
      id: 'fix-3b',
      title: 'GSTR-3B liability looks wrong',
      body: "Common causes:\n\n- **Filed GSTR-1 first?** — 3.1 outward supplies should match GSTR-1. If not, fix the source data.\n- **GSTR-2B reconciled?** — Section 4 ITC should match the matched portion of 2B, not your full Tally purchases.\n- **RCM split correctly?** — RCM liability + ITC must both be shown in 3B (separate rows).\n\nIf the numbers still don't add up, your books have errors — go back and audit the month's vouchers.",
      check: {
        question: 'Numbers fixed?',
        options: [
          { label: 'Yes', next: 'gstr3b-file' },
          { label: 'No', next: 'flag-instructor' },
        ],
      },
    },
    {
      id: 'gstr3b-file',
      label: 'File 3B',
      title: 'File GSTR-3B on the portal',
      body: "1. **gst.gov.in** → **Returns Dashboard** → pick month → **GSTR-3B**\n2. Manually enter the values from Tally's 3B preview (3B doesn't support JSON upload yet on the portal — check current rules)\n3. **Save** → **Preview Draft**\n4. **Pay tax** if liability > ITC — pay via cash ledger or net banking from the portal\n5. **File with DSC/EVC**",
      callout: {
        kind: 'warning',
        text: "GSTR-3B filing closes the month for ITC purposes. Once filed, you can't claim more ITC for that month except via DRC-03.",
      },
      check: {
        question: '3B filed?',
        options: [
          { label: 'Yes — got ARN', next: 'done' },
          { label: 'Payment failed', next: 'flag-instructor' },
        ],
      },
    },
    {
      id: 'flag-instructor',
      title: 'Bring it to your instructor',
      body: "GST filing has many edge cases. Take screenshots of your Tally GSTR view + the portal error/screen. Don't proceed with filing if there's any mismatch — ask first.",
      terminal: true,
    },
    {
      id: 'done',
      title: 'Filed!',
      body: 'Filing returns from Tally (rather than spreadsheets) is faster, more accurate, and audit-friendly. Make this your monthly routine:\n\n- **By 11th:** GSTR-1\n- **By 13th:** GSTR-2B reconciliation\n- **By 20th:** GSTR-3B\n\n**Next:** the **TDS** guide for Income Tax compliance.',
      terminal: true,
    },
  ],
}
