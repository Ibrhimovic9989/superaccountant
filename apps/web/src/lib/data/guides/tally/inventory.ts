import type { Guide } from '../types'

export const TALLY_INVENTORY: Guide = {
  slug: 'tally-prime-inventory',
  title: 'Inventory in Tally — godowns, batches, BOM',
  subtitle: 'Multi-warehouse stock, batch + expiry tracking, manufacturing bills of material',
  hook: "Once you stop selling out of one storeroom, Tally's inventory engine kicks in. Multi-godown, batch-wise, expiry-tracked, manufactured-from-recipe — all of it.",
  market: 'both',
  family: 'tally-prime',
  estimatedMinutes: 25,
  emoji: '📦',
  color: 'success',
  prerequisites: [
    'Stock items already created (see Masters guide)',
    'F11 → Inventory features enabled',
  ],
  outcomes: [
    'Multiple godowns set up with movement between them',
    'Batch-wise stock with expiry dates tracked',
    'Bill of Materials (BOM) for a manufactured item',
    'Stock summary report read with movement, valuation, ageing',
  ],
  startStepId: 'enable-features',
  steps: [
    {
      id: 'enable-features',
      label: 'Enable',
      title: 'Turn on inventory features',
      body: 'F11 → **Inventory Features**. Enable:\n\n- **Maintain multiple godowns:** Yes\n- **Maintain batch-wise details:** Yes\n- **Use expiry dates:** Yes (for pharma / FMCG)\n- **Track additional cost on purchases:** Yes\n- **Use Bill of Materials:** Yes (for manufacturing)\n- **Track standard cost / standard selling price:** optional\n\n**Ctrl + A** to save.',
      callout: {
        kind: 'tip',
        text: "Don't enable everything blindly. Each feature adds fields to every voucher — only turn on what your business actually uses.",
      },
      next: 'godowns',
    },
    {
      id: 'godowns',
      label: 'Godowns',
      title: 'Create godowns (warehouses)',
      body: 'Gateway → **Create** → **Godown**.\n\n- **Name:** *Mumbai Main Warehouse*\n- **Under:** Primary (or another godown for sub-warehouses)\n- **Address**\n\nRepeat for each location: *Delhi DC*, *Cochin Branch*, *Showroom*, etc.\n\nFrom now on every stock-affecting voucher asks **"From which godown?"**.',
      video: {
        youtubeId: 'bXT7-iFvo4A',
        caption: 'Godown management in Tally Prime — multi-location stock',
      },
      check: {
        question: 'Godowns created?',
        options: [
          { label: 'Yes', next: 'stock-transfer' },
          { label: 'Single location only — skip', next: 'batches' },
        ],
      },
    },
    {
      id: 'stock-transfer',
      label: 'Stock transfer',
      title: 'Move stock between godowns',
      body: 'Stock movement between your own godowns = **Stock Journal** voucher (no GST, no party).\n\nGateway → **Vouchers** → **Alt + F7 (Stock Journal)**.\n\n- **Source godown:** *Mumbai Main*\n- **Destination godown:** *Delhi DC*\n- **Item + qty**\n\n**Ctrl + A** to save. Stock summary now reflects the move.',
      next: 'batches',
    },
    {
      id: 'batches',
      label: 'Batches',
      title: 'Batch-wise tracking',
      body: "When booking a purchase voucher for batch-tracked items, Tally now asks for:\n\n- **Batch / Lot No:** supplier's batch\n- **Mfg Date** + **Expiry Date**\n\nWhen you sell, Tally proposes the **earliest-expiring batch first** (FEFO). Critical for pharma, FMCG, food.",
      callout: {
        kind: 'warning',
        text: "FEFO suggestion is only as good as the dates you book. Get sloppy on expiry dates and you'll ship expired stock.",
      },
      check: {
        question: 'Booked a purchase with batch + expiry?',
        options: [
          { label: 'Yes', next: 'bom' },
          { label: 'Batch fields not appearing', next: 'fix-batch' },
          { label: 'Skip — non-perishable goods', next: 'bom' },
        ],
      },
    },
    {
      id: 'fix-batch',
      title: 'Batch fields not appearing',
      body: '1. **Stock item config** — Alter → Stock Item → **Maintain in batches: Yes**\n2. **F11** — confirm Maintain batch-wise details: Yes\n3. **F12** in voucher — confirm batch column visible',
      check: {
        question: 'Working now?',
        options: [
          { label: 'Yes', next: 'bom' },
          { label: 'No', next: 'flag-instructor' },
        ],
      },
    },
    {
      id: 'bom',
      label: 'BOM',
      title: 'Bill of Materials (manufacturing)',
      body: 'If you assemble products: a **Bill of Materials** lists what raw materials make one finished good.\n\n**Step 1:** Stock item → Alter → set **Components (BOM): Yes** → enter recipe.\n  Example: *Office Chair — Black* needs:\n  - 1 × Chair Frame\n  - 1 × Cushion Set\n  - 4 × Wheels\n  - 1 × Hardware Pack\n\n**Step 2:** When manufacturing, use **Manufacturing Journal** voucher → pick the finished item → enter qty produced. Tally **auto-debits** raw materials and **auto-credits** finished goods.',
      callout: {
        kind: 'tip',
        text: 'Cost of finished good = sum of component costs + any additional cost (labour, overhead) you add at the manufacturing voucher level.',
      },
      check: {
        question: 'BOM set up?',
        options: [
          { label: 'Yes', next: 'reports' },
          { label: "Don't manufacture — skip", next: 'reports' },
        ],
      },
    },
    {
      id: 'reports',
      label: 'Reports',
      title: 'Inventory reports to live in',
      body: '**Display → Inventory Books**\n\n- **Stock Summary** — qty + value per item per godown\n- **Movement Analysis** — fast-moving / slow-moving / dead stock by date range\n- **Stock Ageing** — how long has each item been sitting\n- **Re-order Status** — items below their reorder level → list to reorder\n- **Godown-wise stock**\n- **Batch-wise stock + expiry alerts**\n\nAt month-end run **Stock Summary** + **Stock Ageing** to spot dead stock you should write off or push to clear.',
      next: 'verify',
    },
    {
      id: 'verify',
      label: 'Verify',
      title: 'Physical verification routine',
      body: 'Every quarter (more often for high-value goods):\n\n1. Print **Stock Summary** as on date\n2. Physically count actual stock in each godown\n3. Note any differences\n4. Book a **Stock Journal** voucher to adjust:\n   - Stock found > Tally → debit stock, credit Stock Adjustment (income)\n   - Stock found < Tally → credit stock, debit Stock Adjustment (loss)\n\nLine items with shrinkage > 1% should trigger a security/process review.',
      callout: {
        kind: 'warning',
        text: "Big shrinkages aren't accidents — they're either accounting errors (wrong qty in vouchers) or pilferage. Investigate, don't just adjust.",
      },
      next: 'done',
    },
    {
      id: 'flag-instructor',
      title: 'Ask your instructor',
      body: "Inventory features layer on top of each other (batches → expiry → FEFO → reorder). Bring your firm's actual stock list to your next class — your instructor will help you turn on only what's needed.",
      terminal: true,
    },
    {
      id: 'done',
      title: 'Inventory engine running',
      body: 'Multi-godown + batch + BOM is everything most Indian SMEs need. Pharma / FMCG / manufacturing firms hire accountants who can run this — practice on a dummy company to lock the workflows.\n\n**Next:** **Cost Centres** (multi-branch / multi-project tracking) or **Payroll** (employee salaries).',
      terminal: true,
    },
  ],
}
