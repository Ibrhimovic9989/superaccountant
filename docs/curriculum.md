# SuperAccountant Curriculum — India & KSA Tracks

Two parallel tracks. Same shape, different content. Both end in a Grand Test → Certificate.

> The user will provide the **raw curriculum** later. This file is the **structural blueprint** the engine builds against. When the raw curriculum lands, drop it into `contexts/curriculum/seed/{india,ksa}/` as MDX and the seeder will hydrate the DB.

---

## Shape (both tracks)

```
Track
└── Phase 0  — Entry Test (adaptive placement, 20–30 questions)
└── Phase 1  — Foundation        (~3 weeks of daily assignments)
└── Phase 2  — Core              (~6 weeks)
└── Phase 3  — Specialization    (~4 weeks)
└── Phase 4  — Capstone + Grand Test
└── Certificate (bilingual PDF, QR-verified)
```

Each lesson has: `learning_objectives[]`, `prerequisites[]`, `content_en.mdx`, `content_ar.mdx`, `assessment_blueprint`, `embedding`.

---

## 🇮🇳 India Track — "Chartered Path"

**Audience:** B.Com / CA aspirants / SME accountants in India.
**Regulatory anchors:** Companies Act 2013, Income Tax Act 1961, GST Acts 2017, Ind AS, SEBI LODR.

### Phase 1 — Foundation
1. Accounting Principles (Indian context, double entry, Indian GAAP overview)
2. Books of Accounts under Indian law
3. Bank reconciliation, petty cash, vouchers
4. Introduction to Tally / Zoho Books / Busy
5. Trial balance, P&L, Balance Sheet (Schedule III format)

### Phase 2 — Core
1. **GST end-to-end**
   - CGST/SGST/IGST mechanics
   - HSN/SAC, place of supply, RCM
   - GSTR-1, GSTR-3B, GSTR-9, GSTR-2B reconciliation
   - E-invoicing (IRN, QR), e-way bills
2. **TDS & TCS**
   - Sections 192, 194A/C/H/I/J/Q, 195
   - Form 26Q/24Q/27Q, TRACES, Form 16/16A
3. **Income Tax — Business**
   - PGBP, depreciation under IT Act vs Companies Act
   - Advance tax, Section 44AB tax audit
4. **Companies Act 2013**
   - Schedule III financials, MGT-7, AOC-4
   - CARO 2020, related-party (Sec 188)
5. **Payroll**
   - PF, ESI, PT, gratuity, bonus

### Phase 3 — Specialization (student picks 2)
- Ind AS conversion (Ind AS 115, 116, 109)
- Internal audit & SOX-style controls for listed entities
- Forensic accounting basics
- Transfer pricing (Form 3CEB)
- Startup accounting (ESOPs, convertible notes, DPIIT)

### Phase 4 — Capstone
- Full-year close for a fictional Pvt Ltd: vouchers → trial balance → Schedule III → tax computation → GST annual return → board-ready financials.
- **Grand Test** — 3 hours: 60 MCQ + 4 scenarios + 1 workpaper.

---

## 🇸🇦 KSA Track — "Mu'tamad Path"

**Audience:** SOCPA candidates, ZATCA-bound SME accountants, finance staff in KSA.
**Regulatory anchors:** ZATCA regulations, VAT Implementing Regulations, RETT, Zakat Bylaws, IFRS as adopted in KSA, Saudi Companies Law.

### Phase 1 — Foundation
1. Accounting principles (IFRS-aligned from day one)
2. Chart of accounts under SOCPA conventions
3. Bank reconciliation, petty cash, supporting documents (ZATCA evidentiary requirements)
4. Intro to local ERPs (SAP B1, Odoo, Zoho with KSA localization)
5. Statement of financial position, P&L, cash flows under IFRS

### Phase 2 — Core
1. **VAT in KSA**
   - Standard 15%, zero-rated, exempt, out-of-scope
   - Place & time of supply, RCM on imports
   - VAT returns (monthly/quarterly), VAT groups
   - Input VAT recovery, blocked credits
2. **ZATCA E-invoicing (Fatoora)**
   - Phase 1 (Generation) and Phase 2 (Integration)
   - XML structure, UUID, hash, QR, cryptographic stamp
   - Standard vs Simplified invoices
3. **Zakat**
   - Zakat base computation (assets vs liabilities approach)
   - Mixed entities (Zakat + corporate income tax)
   - Filing on ZATCA portal
4. **Withholding Tax (KSA)**
   - 5/15/20% on non-resident payments
   - DTAA application
5. **Saudi Companies Law & MOC filings**
   - LLC, JSC, branches of foreign companies
   - Statutory reserves, board reporting

### Phase 3 — Specialization (student picks 2)
- IFRS deep dive (IFRS 15, 16, 9, 17)
- RETT (Real Estate Transaction Tax) compliance
- Excise tax (tobacco, sugary drinks, energy drinks)
- Transfer pricing under KSA TP Bylaws (Form, Local File, Master File, CbCR)
- Saudization & GOSI payroll compliance

### Phase 4 — Capstone
- Full-year close for a fictional KSA LLC: invoices → ZATCA Phase-2 submission → VAT return → Zakat computation → IFRS financials → board pack.
- **Grand Test** — 3 hours: 60 MCQ + 4 scenarios + 1 ZATCA-compliant invoice generation workpaper.

---

## Cross-track shared modules (ship once, reuse)

- Excel / Sheets for accountants (formulas, pivot, Power Query basics)
- Soft skills: client communication, audit query handling
- Ethics (ICAI Code / SOCPA Code — branched per track)
- Intro to AI for accountants (using SuperAccountant agent itself, meta module)

---

## Assessment Blueprint (per lesson)

```yaml
assessment_blueprint:
  objective_items: 5    # MCQs, auto-graded
  short_answer: 2       # model-graded with rubric
  scenario: 1           # multi-step, plan-mode capable
  mastery_threshold: 0.75
  spaced_repetition_days: [1, 3, 7, 21]
```

## Daily Assignment Generation

`GenerateAssignmentTool` runs at 06:00 student-local via Supabase cron:

1. Pull yesterday's mastery delta from `learning.progress`.
2. Pick 1 weak-area review + 1 new lesson + 1 spaced-repetition item.
3. Compose bilingual assignment doc.
4. Notify via email + in-app.

## Grand Test Proctoring

`GrandTestProctorAgent` (sub-agent):
- Time-boxed, single attempt, no tool access for the student-facing surface.
- Records every keystroke + tool call to `assessment.grand_test_audit`.
- On pass → spawns `CertificateAgent` → `IssueCertificateTool` (permission-gated).

## Certificate

Bilingual single-page PDF:
- Student name (EN + AR transliteration)
- Track + phase completed
- Score, date (Gregorian + Hijri for KSA)
- QR → `https://superaccountant.app/verify/<hash>`
- HMAC-signed hash stored in `certification.certificates`
