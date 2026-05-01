import type { Guide } from '../types'

export const ZOHO_INVENTORY: Guide = {
  slug: 'zoho-books-inventory',
  title: 'Inventory in Zoho Books — multi-warehouse + batches',
  subtitle: 'Track stock by warehouse, batch, and serial number — natively in Zoho',
  hook: 'If you carry physical stock, the Zoho Inventory features (built into Books or via the dedicated Zoho Inventory app) keep your stock balance and your books always in sync — no separate tally-vs-physical reconciliation.',
  market: 'both',
  family: 'zoho-books',
  estimatedMinutes: 25,
  emoji: '📦',
  color: 'success',
  prerequisites: ['Zoho Books org set up', 'Items already created with item type = "Goods"'],
  outcomes: [
    'Multiple warehouses configured with stock movement between them',
    'Batch + serial-number tracking for relevant items',
    'Re-order points + low-stock alerts set',
    'Inventory adjustment for physical-count differences',
  ],
  startStepId: 'enable',
  steps: [
    {
      id: 'enable',
      label: 'Enable',
      title: 'Turn on inventory tracking',
      body: '**Settings** → **Preferences** → **Items** → **Enable Inventory Tracking**.\n\nThis adds:\n- Stock on hand on every item\n- Warehouse + batch + serial fields on vouchers\n- Inventory reports module\n\nIf your business is **service-only**, skip this.',
      video: {
        youtubeId: '9au4kFztpNE',
        caption: 'Manage inventory in Zoho Books — full beginner tutorial',
      },
      callout: {
        kind: 'warning',
        text: "Once enabled, you'll be asked to enter **opening stock** for each goods item. Don't skip this — opening stock is what your year-1 balance sheet builds on.",
      },
      check: {
        question: 'Inventory tracking on?',
        options: [
          { label: 'Yes', next: 'warehouses' },
          { label: 'Service-only — skip whole guide', next: 'done' },
        ],
      },
    },
    {
      id: 'warehouses',
      label: 'Warehouses',
      title: 'Set up warehouses',
      body: '**Settings** → **Inventory** → **Warehouses** → **+ New**.\n\n- **Name:** *Mumbai Main Warehouse*\n- **Address** + state (controls GST behaviour for inter-state stock transfers)\n- **Mark as primary** for the default warehouse\n\nRepeat for each location. **Save**.',
      callout: {
        kind: 'tip',
        text: 'If a single warehouse is in a different state from your registered office, it may need a separate GST registration — check with your CA before stocking it.',
      },
      check: {
        question: 'Warehouses created?',
        options: [
          { label: 'Yes', next: 'opening-stock' },
          { label: 'Single location — skip', next: 'opening-stock' },
        ],
      },
    },
    {
      id: 'opening-stock',
      label: 'Opening stock',
      title: 'Enter opening stock',
      body: 'For each goods item:\n\n**Items** → pick item → **Edit** → set **Opening Stock**:\n- **Qty** + **Rate** per warehouse\n- **As-of date** = your books-start date\n\nZoho creates an **Opening Stock Adjustment** voucher behind the scenes — this is your inventory-side opening balance.',
      next: 'transfer',
    },
    {
      id: 'transfer',
      label: 'Transfer',
      title: 'Move stock between warehouses',
      body: "**Inventory Adjustments** → **+ New** → **Transfer Order**.\n\n- **From:** *Mumbai Main*\n- **To:** *Delhi DC*\n- **Items + qty**\n- **Date**\n\n**Save**. No GST involved (it's your own stock moving), but if warehouses are in different states there's an interstate stock transfer document for road carriage — generate the **e-way bill** if value > ₹50,000.",
      next: 'batches',
    },
    {
      id: 'batches',
      label: 'Batches',
      title: 'Batch + serial tracking',
      body: "For pharma / FMCG / electronics:\n\nItems → pick item → Edit → **Track inventory by:** **Batches** OR **Serial numbers**.\n\n**Batches:** Lot No + Mfg Date + Expiry Date — good for pharma, food.\n**Serial numbers:** unique per unit — good for electronics, IMEI-tracked goods.\n\nFrom now on, every receipt voucher asks for batch / serial details, and every sale voucher asks which batch / serial you're shipping.",
      callout: {
        kind: 'warning',
        text: 'Track by batches OR serials — not both. Once you have transactions, switching is hard.',
      },
      check: {
        question: 'Batch / serial tracking set up (or skipped)?',
        options: [
          { label: 'Done', next: 'reorder' },
          { label: 'Skip — non-critical', next: 'reorder' },
        ],
      },
    },
    {
      id: 'reorder',
      label: 'Re-order',
      title: 'Set re-order points',
      body: 'Items → pick item → **Edit** → set:\n\n- **Reorder point:** stock level at which Zoho alerts you to reorder\n- **Preferred vendor:** auto-fills on the new PO\n\n**Reports → Inventory → Inventory Summary** has a **Below Reorder Level** filter that gives you the daily reorder list.',
      callout: {
        kind: 'tip',
        text: "Reorder point = (lead time in days × daily consumption) + safety stock. Don't just guess — model it for your top 20 items.",
      },
      next: 'adjustments',
    },
    {
      id: 'adjustments',
      label: 'Adjustments',
      title: 'Inventory adjustments (physical count)',
      body: 'Quarterly physical count → expected vs actual differences:\n\n**Inventory Adjustments** → **+ New** → **Quantity Adjustment**.\n\n- Pick item, warehouse\n- **Adjustment type:** Increase / Decrease\n- **Reason:** Damaged / Lost / Counted-different / Other\n\nZoho posts a journal hitting *Inventory Asset* and *Inventory Adjustments* (P&L). Tag the **Reason** clearly — auditors will ask.',
      callout: {
        kind: 'warning',
        text: "Shrinkages > 1% of inventory value = audit flag. Investigate before adjusting — usually it's process (wrong picker), not theft.",
      },
      next: 'reports',
    },
    {
      id: 'reports',
      label: 'Reports',
      title: 'Inventory reports',
      body: '**Reports** → **Inventory**:\n\n- **Inventory Summary** — qty + value per item per warehouse\n- **Inventory Valuation** — at FIFO / weighted average\n- **Stock Aging** — how long items have been sitting\n- **Item-wise Sales / Purchases** — fast-mover analysis\n- **Reorder Status** — daily reorder list\n\nMonthly: **Inventory Summary** + **Aging** to spot dead stock.',
      next: 'done',
    },
    {
      id: 'flag-instructor',
      title: 'Ask your instructor',
      body: 'Inventory + tax is firm-specific (HSN per warehouse for multi-state, e-way bill thresholds, FIFO vs weighted-average choice). Bring your sample bills + warehouse list to class.',
      terminal: true,
    },
    {
      id: 'done',
      title: 'Inventory engine running',
      body: 'Multi-warehouse + batches + reorders is everything most Indian inventory-heavy SMEs need. For more complex flows (composite items, kits, drop-ship), upgrade to the dedicated **Zoho Inventory** app.\n\n**Next:** **Projects + Time Tracking** for service businesses, or **Reports** for management dashboards.',
      terminal: true,
    },
  ],
}
