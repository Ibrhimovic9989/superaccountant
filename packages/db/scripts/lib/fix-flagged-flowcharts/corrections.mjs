/**
 * Per-slug hand-tuned corrections for the worst flagged mermaid blocks.
 *
 * Each entry has the SLUG as key and a `columnUpdates` object describing
 * which CurriculumLesson columns to replace and with what.
 *
 *   - `flowchartMermaid` / `mindmapMermaid` → raw mermaid source (no
 *      ```mermaid fences; the column stores bare source)
 *   - `appendToContentEnMdx` → markdown to append to contentEnMdx after
 *      the existing body. Used when a split flowchart's second half
 *      needs an inline home (so the main column stays one diagram).
 *
 * Sourced from `docs/lesson-flowchart-audit.md` ("Top 10 — detailed
 * breakdown"). Mindmap trims keep the 3-level structure; pruned leaves
 * are content already covered by the lesson prose around the diagram.
 *
 * Anything NOT in this table is touched ONLY by the mechanical pipeline
 * (see `mechanical.mjs`). Mechanical alone fixes most flagged flowcharts;
 * the structural rewrites here address node-explosion and line-explosion.
 */

/**
 * @typedef {{
 *   flowchartMermaid?: string,
 *   mindmapMermaid?: string,
 *   appendMermaidToContentEnMdx?: string,
 *   note: string,
 * }} CorrectionEntry
 */

/** @type {Record<string, CorrectionEntry>} */
export const STRUCTURAL_CORRECTIONS = {
  // ── #1 GST TDS/TCS mindmap (51 lines → 24) ────────────────────────────
  'in-gst-tds-tcs-under-gst': {
    mindmapMermaid: `mindmap
  root((GST TDS and TCS))
    TDS Sec 51
      Who deducts
        Govt, PSUs, notified
      Rate & threshold
        1% CGST + 1% SGST
        Contract > 2.5L
      Return: GSTR-7
    TCS Sec 52
      Who collects
        E-commerce operators
      Rate
        1% net value
      Return: GSTR-8
    Compliance
      Mandatory registration
      Pay by due date
      Late fee + interest
    Credit to supplier
      Cash ledger reflection
      Utilised against output tax`,
    note: 'Mindmap trimmed 51 → 24 lines. Dropped Govt/Local/PSU sublist (covered in prose), payment timing leaves, demand-recovery wording. Three-level structure preserved.',
  },

  // ── #2 AS key standards flowchart (19 nodes → split into 2) ───────────
  'in-as-key-standards': {
    flowchartMermaid: `flowchart LR
%% Part 1 of 2 — discover which standards apply
A[Start] --> B[Identify Transactions]
B --> C["Select Policies (AS 1)"]
C --> D{Inventory Involved?}
D -- Yes --> E["Value Inventory (AS 2)"]
D -- No --> F{Revenue Recognized?}
E --> F
F -- Yes --> G["Recognize Revenue (AS 9)"]
F -- No --> H{Fixed Assets?}
G --> H`,
    appendMermaidToContentEnMdx: `flowchart LR
%% Part 2 of 2 — fixed assets, deferred tax, disclosure
H -- Yes --> I["Record Assets (AS 10)"]
H -- No --> J{Timing Tax Differences?}
I --> J
J -- Yes --> K["Account Deferred Tax (AS 22)"]
J -- No --> L[Prepare Financials]
K --> L
L --> M["Disclosures & Compliance"]
M --> N[End]`,
    note: 'Split 19-node flowchart at the H{Fixed Assets?} branch — natural narrative break between "what to recognise" and "how to disclose". Second half appended as a fenced mermaid block in contentEnMdx.',
  },

  // ── #3 GST Time/Value of Supply mindmap (46 lines → 25) ───────────────
  'in-gst-time-and-value-of-supply': {
    mindmapMermaid: `mindmap
  root((Time and Value of Supply))
    Time of Supply
      Goods
        Earlier of invoice / payment
      Services
        Invoice or payment date
      Reverse charge & vouchers
    Value of Supply
      Transaction value default
      Includes
        Non-GST taxes, incidentals
      Excludes
        Discounts, subsidies
    Special valuation
      Related persons
        Open market / like-kind
      Pure agent rule
    Practical impact
      Liability at earliest event
      Cash flow & working capital`,
    note: 'Mindmap trimmed 46 → 21 lines. Collapsed each branch to its essential 1–2 leaves; "Special cases" merged into Time-of-Supply; GST payable section absorbed into "Practical impact".',
  },

  // ── #4 TDS Key Sections flowchart (19 nodes → split into 2) ───────────
  'in-tds-key-sections': {
    flowchartMermaid: `flowchart LR
%% Part 1 of 2 — salary, interest, contracts, commission
A[Identify Payment] --> B{Salary?}
B -->|Yes| S192["Sec 192 - Salary TDS"]
B -->|No| C{Interest?}
C -->|Yes| S194A["Sec 194A - Interest (Non-Salary)"]
C -->|No| D{Contract Work?}
D -->|Yes| S194C["Sec 194C - Contractor"]
D -->|No| E{"Commission/Brokerage?"}
E -->|Yes| S194H["Sec 194H - Commission"]
E -->|No| F{Rent?}`,
    appendMermaidToContentEnMdx: `flowchart LR
%% Part 2 of 2 — rent, professional, goods purchase, non-resident
F -->|Yes| S194I["Sec 194I - Rent"]
F -->|No| G{"Professional/Technical Fees?"}
G -->|Yes| S194J["Sec 194J - Professional Fees"]
G -->|No| H{Purchase of Goods?}
H -->|Yes| S194Q["Sec 194Q - Goods Purchase"]
H -->|No| I{Non-Resident Payee?}
I -->|Yes| S195["Sec 195 - Non-Resident Payment"]
I -->|No| Z[Check Other Sections]`,
    note: 'Split 19-node decision tree after F{Rent?}. First half covers the four most-common deductions students see in practice; second half handles the remaining specialist sections.',
  },

  // ── #5 Payroll PF/ESI/PT/Gratuity flowchart (19 nodes → split) ────────
  'in-payroll-pf-esi-pt': {
    flowchartMermaid: `flowchart LR
%% Part 1 of 2 — EPF + ESI applicability and rates
A[Start Payroll] --> B{Establishment Size}
B -->|">=20"| C{"Basic+DA <=15k?"}
C -->|"Yes/Opt-in"| D[EPF Applies]
D --> D1["Employee 12%"]
D --> D2["Employer 12% (EPS 8.33%)"]
D --> D3["Deposit by 15th (ECR)"]
B -->|">=10 + Area"| E{"Gross <=21k?"}
E -->|Yes| F[ESI Applies]
F --> F1["Emp 0.75%"]
F --> F2["Er 3.25%"]`,
    appendMermaidToContentEnMdx: `flowchart LR
%% Part 2 of 2 — Professional Tax + Gratuity
A2[Start Payroll] --> G[Professional Tax]
G --> G1["State-specific slabs & dates"]
A2 --> H{Termination?}
H -->|After 5+ yrs service| I[Gratuity Applies]
I --> I1["15 days wages / yr"]
I --> I2["Cap Rs 20L"]
F2[ESI deposit] --> F3[Deposit by 15th]`,
    note: 'Split at the EPF/ESI vs PT/Gratuity boundary — two genuinely separate compliance regimes that the lesson body discusses sequentially. ASCII >= used in pipe labels since mermaid does not quote those.',
  },

  // ── #6 Final balance sheet flowchart (14 nodes → quote + tighten) ─────
  'in-final-balance-sheet': {
    flowchartMermaid: `flowchart LR
A[Companies Act 2013] --> B[Schedule III Framework]
B --> C[Prepare Balance Sheet]
C --> D["Equity & Liabilities"]
C --> E[Assets]
D --> F["Shareholders' Funds"]
F --> G[Share Capital]
F --> H["Reserves & Surplus (Debit shown negative)"]
D --> I[Liabilities]
I --> J[Non-current Liab]
I --> K["Current Liab (MSME disclosure)"]
E --> L[Non-current Assets]
E --> M[Current Assets]
C --> N["Contingent Liab & Commitments (Notes)"]`,
    note: 'Already at the node threshold (14). Mechanical-only fix would handle quoting but we lock it in here so reviewers see the canonical form.',
  },

  // ── #7 House property flowchart (13 nodes → quote, no split) ──────────
  'in-tax-house-property': {
    flowchartMermaid: `flowchart LR
A["Start: House Property"] --> B{Section 22 Conditions Met?}
B -->|Yes| C{Property Type}
B -->|No| Z[Not Taxable]
C --> D[Self-Occupied]
C --> E[Let-Out]
C --> F[Deemed Let-Out]
D --> G["Annual Value = Nil (Sec 23(2))"]
E --> H["Compute Annual Value (Sec 23(1))"]
F --> H
G --> I[Deductions Sec 24]
H --> I
I --> J["Interest on Loan + Std Deduction 30%"]
J --> K["Compute Income / Loss"]
K --> L["Set-off & Carry Forward"]`,
    mindmapMermaid: `mindmap
  root((House Property))
    Property type
      Self-occupied
      Let-out
      Deemed let-out
    Annual value
      Sec 23(2) — SOP nil
      Sec 23(1) — let-out
    Deductions Sec 24
      Std deduction 30%
      Interest on housing loan
    Result
      Income or loss
      Set-off & carry-forward`,
    note: 'Flowchart: quote every parens-bearing and colon-bearing label; merge the two-line "Interest + Std Deduction" node into one quoted label. Mindmap rebuilt to ~17 lines (was 30).',
  },

  // ── #8 Depreciation: mindmap trim + flowchart quote-pass ──────────────
  'in-adj-depreciation': {
    mindmapMermaid: `mindmap
  root((Depreciation))
    Meaning
      Cost allocation over useful life
    Methods
      SLM — equal annual charge
      WDV — higher in early years
    Companies Act
      Schedule II useful lives
      Residual value 5%
    Income-tax Act
      Sec 32 block of assets
      Prescribed rates + add'l dep
    Reconciliation
      Timing differences
      Deferred tax`,
    note: 'Mindmap pruned 37 → 17 lines. Sub-leaves rolled into their parent (e.g. "Equal charge / Original cost / Useful life / Residual" → one line under SLM). Lesson prose already enumerates each.',
  },

  // ── #9 AP process mindmap (36 → 22) ──────────────────────────────────
  'in-ap-process': {
    mindmapMermaid: `mindmap
  root((AP — Procure to Pay))
    Requisition & PO
      PR approval, vendor selection
      PO terms & authorisation
    Goods receipt
      GRN, quality check
      Discrepancy note
    Invoice processing
      Capture, validate, post
    Three-way match
      PO vs GRN vs Invoice
      Tolerance rules
    Statutory checks
      GST, TDS, MSMED timelines
    Payment & settlement
      Payment run, modes, advice
    Accounting & reporting
      Accruals, recon, aging`,
    note: 'Mindmap pruned 36 → 22 lines. Each P2P stage kept at L2 with one or two L3 child summarising what the lesson body covers in detail.',
  },

  // ── #10 GST intro flowchart — quote labels with /, &, parens ──────────
  'in-gst-introduction-and-benefits': {
    flowchartMermaid: `flowchart LR
A["Multiple Indirect Taxes (VAT, Excise, Service Tax)"] --> B["Problems: Cascading, Complexity"]
B --> C["GST Introduced 1 July 2017"]
C --> D[Unified Tax System]
C --> E[Input Tax Credit]
C --> F[Dual Taxing Powers]
C --> G[Digital Compliance]
C --> H[Dual GST Model]
H --> I["CGST (Central Govt)"]
H --> J["SGST / UTGST (State / UT Govt)"]
H --> K["IGST (Inter-State Supply)"]`,
    note: 'Flowchart: collapse <br/>-separated qualifier lines into single quoted labels. No node-count problem; pure quote-pass.',
  },
}

/**
 * Lookup helper. Returns null if the slug has no hand-tuned correction.
 *
 * @param {string} slug
 * @returns {CorrectionEntry | null}
 */
export function getStructuralCorrection(slug) {
  return STRUCTURAL_CORRECTIONS[slug] ?? null
}
