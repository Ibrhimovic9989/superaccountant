/**
 * Lesson-specific visualizer scenarios.
 *
 * Each scenario is a set of transactions that demonstrates the core
 * double-entry logic of a particular topic — IFRS 16 leases,
 * depreciation, GST input credit, TDS, etc.
 *
 * Mapping: lesson slug (or slug pattern) → scenario.
 * The lesson page calls pickScenario(slug) to select the best match.
 */

export type VisualizerTransaction = {
  id: string
  description: string
  descriptionAr: string
  debitAccount: string
  creditAccount: string
  amount: number
  explanation: string
  explanationAr: string
  voiceEn: string
  voiceAr: string
}

type Scenario = {
  title: string
  titleAr: string
  transactions: VisualizerTransaction[]
}

// ─── Generic double-entry basics (fallback) ─────────────────

const BASICS: Scenario = {
  title: 'Double-Entry Flow',
  titleAr: 'تدفق القيد المزدوج',
  transactions: [
    {
      id: 'b1',
      description: 'Sold goods to Patel Enterprises on credit',
      descriptionAr: 'بيع بضائع لشركة باتل بالأجل',
      debitAccount: 'Patel Enterprises (Debtor)',
      creditAccount: 'Sales A/c',
      amount: 85000,
      explanation: 'Debtor increases (asset ↑), Sales increases (income ↑)',
      explanationAr: 'المدين يزيد (أصل ↑)، المبيعات تزيد (إيراد ↑)',
      voiceEn:
        'We sold goods worth 85 thousand rupees to Patel Enterprises, but they have not paid yet. So Patel now owes us money — that is a debtor, an asset for us. And we earned sales revenue. So we debit the debtor account and credit the sales account.',
      voiceAr:
        'بعنا بضائع بقيمة ٨٥ ألف روبية لشركة باتل، لكنهم لم يدفعوا بعد. فشركة باتل الآن مدينة لنا، وهذا أصل بالنسبة لنا. وحققنا إيراد مبيعات. لذلك نجعل حساب المدين مدينًا ونجعل حساب المبيعات دائنًا.',
    },
    {
      id: 'b2',
      description: 'Patel Enterprises paid via bank transfer',
      descriptionAr: 'شركة باتل دفعت عبر التحويل البنكي',
      debitAccount: 'Bank A/c',
      creditAccount: 'Patel Enterprises (Debtor)',
      amount: 85000,
      explanation: 'Bank increases (asset ↑), Debtor decreases (asset ↓)',
      explanationAr: 'البنك يزيد (أصل ↑)، المدين ينقص (أصل ↓)',
      voiceEn:
        'Patel Enterprises has now paid us 85 thousand rupees into our bank account. Our bank balance goes up — an asset increasing, so we debit the bank. And Patel no longer owes us, so the debtor balance goes down. We credit the debtor account. The receivable is settled.',
      voiceAr:
        'شركة باتل دفعت لنا ٨٥ ألف روبية في حسابنا البنكي. رصيد البنك يرتفع، وهذا أصل يزيد، فنجعل البنك مدينًا. وباتل لم تعد مدينة لنا، فنجعل حساب المدين دائنًا. تمت التسوية.',
    },
    {
      id: 'b3',
      description: 'Paid office rent',
      descriptionAr: 'دفع إيجار المكتب',
      debitAccount: 'Rent A/c',
      creditAccount: 'Bank A/c',
      amount: 55000,
      explanation: 'Rent expense increases (expense ↑), Bank decreases (asset ↓)',
      explanationAr: 'مصروف الإيجار يزيد (مصروف ↑)، البنك ينقص (أصل ↓)',
      voiceEn:
        'We paid 55 thousand rupees for office rent. Rent is an expense — it goes up, so we debit the rent account. The money came out of our bank, so bank goes down. We credit the bank.',
      voiceAr:
        'دفعنا ٥٥ ألف روبية إيجار المكتب. الإيجار مصروف، يزيد فنجعله مدينًا. والمال خرج من البنك فنجعل البنك دائنًا.',
    },
  ],
}

// ─── IFRS 16 — Leases ───────────────────────────────────────

const IFRS16: Scenario = {
  title: 'IFRS 16 Lease Recognition',
  titleAr: 'الاعتراف بعقد الإيجار حسب IFRS 16',
  transactions: [
    {
      id: 'l1',
      description: 'Recognize right-of-use asset and lease liability at commencement',
      descriptionAr: 'الاعتراف بأصل حق الاستخدام والتزام الإيجار عند البدء',
      debitAccount: 'Right-of-Use Asset',
      creditAccount: 'Lease Liability',
      amount: 2500000,
      explanation:
        'IFRS 16 requires lessees to recognize both a right-of-use asset and a corresponding lease liability at the present value of future lease payments.',
      explanationAr:
        'يتطلب IFRS 16 من المستأجر الاعتراف بأصل حق الاستخدام والتزام الإيجار المقابل بالقيمة الحالية لدفعات الإيجار المستقبلية.',
      voiceEn:
        'At the start of a lease, IFRS 16 requires us to recognize two things: a right-of-use asset — our right to use the leased property — and a lease liability, which is the present value of all future lease payments. We debit the right-of-use asset for 25 lakh rupees and credit the lease liability for the same amount. Both are balance sheet items, not expenses.',
      voiceAr:
        'عند بداية عقد الإيجار، يتطلب IFRS 16 الاعتراف بشيئين: أصل حق الاستخدام، وهو حقنا في استخدام العقار المستأجر، والتزام الإيجار، وهو القيمة الحالية لجميع دفعات الإيجار المستقبلية. نجعل أصل حق الاستخدام مدينًا بمبلغ ٢٥ لاخ روبية، ونجعل التزام الإيجار دائنًا بنفس المبلغ. كلاهما بند في الميزانية وليس مصروفًا.',
    },
    {
      id: 'l2',
      description: 'Pay monthly lease rental',
      descriptionAr: 'دفع الإيجار الشهري',
      debitAccount: 'Lease Liability',
      creditAccount: 'Bank A/c',
      amount: 50000,
      explanation:
        'Each lease payment reduces the lease liability — not booked as rent expense anymore.',
      explanationAr:
        'كل دفعة إيجار تقلل التزام الإيجار، ولا تُسجل كمصروف إيجار بعد الآن.',
      voiceEn:
        'When we pay the monthly lease rental of 50 thousand rupees, we do not debit rent expense like before IFRS 16. Instead, we debit the lease liability because the payment reduces our obligation. And we credit the bank since money leaves our account. The interest portion is handled separately as finance cost.',
      voiceAr:
        'عندما ندفع الإيجار الشهري بمبلغ ٥٠ ألف روبية، لا نجعل مصروف الإيجار مدينًا كما كان قبل IFRS 16. بل نجعل التزام الإيجار مدينًا لأن الدفعة تقلل التزامنا. ونجعل البنك دائنًا لأن المال يخرج من حسابنا. جزء الفائدة يُعالج بشكل منفصل كتكلفة تمويل.',
    },
    {
      id: 'l3',
      description: 'Record interest expense on lease liability',
      descriptionAr: 'تسجيل مصروف الفائدة على التزام الإيجار',
      debitAccount: 'Interest Expense',
      creditAccount: 'Lease Liability',
      amount: 15000,
      explanation:
        'The effective interest method unwinds the discount, adding interest to the liability.',
      explanationAr:
        'طريقة الفائدة الفعلية تعكس الخصم، مضيفة الفائدة إلى الالتزام.',
      voiceEn:
        'At the end of the month, we calculate interest on the outstanding lease liability using the effective interest rate. Say it comes to 15 thousand rupees. We debit interest expense because it is a cost for the period, and we credit the lease liability because the obligation has grown by the interest accrued.',
      voiceAr:
        'في نهاية الشهر، نحسب الفائدة على التزام الإيجار القائم باستخدام معدل الفائدة الفعلي. لنفترض أنها ١٥ ألف روبية. نجعل مصروف الفائدة مدينًا لأنها تكلفة للفترة، ونجعل التزام الإيجار دائنًا لأن الالتزام زاد بقيمة الفائدة المستحقة.',
    },
    {
      id: 'l4',
      description: 'Record depreciation on right-of-use asset',
      descriptionAr: 'تسجيل الاستهلاك على أصل حق الاستخدام',
      debitAccount: 'Depreciation Expense',
      creditAccount: 'Accumulated Depreciation — ROU',
      amount: 42000,
      explanation:
        'The ROU asset is depreciated over the shorter of lease term and useful life.',
      explanationAr:
        'أصل حق الاستخدام يستهلك على مدى أقصر من مدة الإيجار والعمر الإنتاجي.',
      voiceEn:
        'The right-of-use asset is depreciated just like any other fixed asset — over the shorter of the lease term or the assets useful life. Say monthly depreciation is 42 thousand rupees. We debit depreciation expense and credit accumulated depreciation. This is a non-cash charge that reduces the carrying value of the asset.',
      voiceAr:
        'أصل حق الاستخدام يُستهلك تمامًا مثل أي أصل ثابت آخر، على مدى أقصر من مدة الإيجار أو العمر الإنتاجي للأصل. لنفترض أن الاستهلاك الشهري ٤٢ ألف روبية. نجعل مصروف الاستهلاك مدينًا ونجعل مجمع الاستهلاك دائنًا. هذا عبء غير نقدي يقلل القيمة الدفترية للأصل.',
    },
  ],
}

// ─── Depreciation (Straight-Line) ───────────────────────────

const DEPRECIATION: Scenario = {
  title: 'Straight-Line Depreciation',
  titleAr: 'الاستهلاك بطريقة القسط الثابت',
  transactions: [
    {
      id: 'd1',
      description: 'Purchase machinery for cash',
      descriptionAr: 'شراء آلات نقدًا',
      debitAccount: 'Machinery (Fixed Asset)',
      creditAccount: 'Bank A/c',
      amount: 1200000,
      explanation: 'Capitalize the asset at cost — not expensed immediately.',
      explanationAr: 'رسملة الأصل بالتكلفة، لا يُصرف فورًا.',
      voiceEn:
        'We buy machinery for 12 lakh rupees. Instead of expensing the whole amount this month, we capitalize it — meaning we record it as a fixed asset on the balance sheet. We debit machinery and credit the bank. The cost will be spread over the machines useful life through depreciation.',
      voiceAr:
        'اشترينا آلات بمبلغ ١٢ لاخ روبية. بدلاً من صرف المبلغ كله هذا الشهر، نقوم برسملته، أي نسجله كأصل ثابت في الميزانية. نجعل الآلات مدينة والبنك دائنًا. التكلفة ستُوزع على العمر الإنتاجي للآلة من خلال الاستهلاك.',
    },
    {
      id: 'd2',
      description: 'Record year 1 depreciation (10-year life, SLM)',
      descriptionAr: 'تسجيل استهلاك السنة الأولى (عمر ١٠ سنوات، طريقة القسط الثابت)',
      debitAccount: 'Depreciation Expense',
      creditAccount: 'Accumulated Depreciation',
      amount: 120000,
      explanation: '12 lakh / 10 years = 1.2 lakh per year depreciation.',
      explanationAr: '١٢ لاخ / ١٠ سنوات = ١٫٢ لاخ استهلاك سنوي.',
      voiceEn:
        'Each year, we spread the cost over the useful life. 12 lakh divided by 10 years equals 1.2 lakh of depreciation annually. We debit depreciation expense, which reduces this years profit, and credit accumulated depreciation — a contra-asset that reduces the machinerys carrying value on the balance sheet.',
      voiceAr:
        'كل سنة، نوزع التكلفة على العمر الإنتاجي. ١٢ لاخ مقسومًا على ١٠ سنوات يساوي ١٫٢ لاخ استهلاك سنوي. نجعل مصروف الاستهلاك مدينًا، وهذا يقلل ربح هذه السنة، ونجعل مجمع الاستهلاك دائنًا، وهو حساب مقابل للأصل يقلل القيمة الدفترية للآلات في الميزانية.',
    },
    {
      id: 'd3',
      description: 'Record year 2 depreciation',
      descriptionAr: 'تسجيل استهلاك السنة الثانية',
      debitAccount: 'Depreciation Expense',
      creditAccount: 'Accumulated Depreciation',
      amount: 120000,
      explanation: 'Same amount every year under straight-line.',
      explanationAr: 'نفس المبلغ كل سنة في طريقة القسط الثابت.',
      voiceEn:
        'In year two, we record another 1.2 lakh of depreciation — same entry as year one. Under the straight-line method, the annual charge is constant. After two years, accumulated depreciation stands at 2.4 lakh, and the machinerys carrying value is 12 lakh minus 2.4 lakh, which is 9.6 lakh.',
      voiceAr:
        'في السنة الثانية، نسجل ١٫٢ لاخ أخرى من الاستهلاك، نفس قيد السنة الأولى. في طريقة القسط الثابت، العبء السنوي ثابت. بعد سنتين، مجمع الاستهلاك يبلغ ٢٫٤ لاخ، والقيمة الدفترية للآلات هي ١٢ لاخ ناقص ٢٫٤ لاخ، أي ٩٫٦ لاخ.',
    },
  ],
}

// ─── TDS / Withholding Tax ──────────────────────────────────

const TDS: Scenario = {
  title: 'TDS on Professional Fees (Section 194J)',
  titleAr: 'خصم الضريبة من المنبع على الأتعاب المهنية (المادة 194J)',
  transactions: [
    {
      id: 'tds1',
      description: 'Record audit fee invoice from Sharma & Co',
      descriptionAr: 'تسجيل فاتورة أتعاب المراجعة من شركة شارما',
      debitAccount: 'Audit Fees Expense',
      creditAccount: 'Sharma & Co (Creditor)',
      amount: 75000,
      explanation: 'Book the expense at the full invoice amount, gross of TDS.',
      explanationAr: 'تسجيل المصروف بكامل مبلغ الفاتورة قبل خصم الضريبة.',
      voiceEn:
        'We received an invoice from Sharma and Company for 75 thousand rupees in audit fees. We record the expense at the full gross amount, even though we will not pay all of it. We debit audit fees expense and credit Sharma and Company as a creditor for the full 75 thousand.',
      voiceAr:
        'استلمنا فاتورة من شركة شارما بمبلغ ٧٥ ألف روبية أتعاب مراجعة. نسجل المصروف بكامل المبلغ الإجمالي، رغم أننا لن ندفعه كله. نجعل مصروف أتعاب المراجعة مدينًا ونجعل شركة شارما دائنة بكامل ٧٥ ألف.',
    },
    {
      id: 'tds2',
      description: 'Deduct TDS at 10% under Section 194J',
      descriptionAr: 'خصم TDS بنسبة ١٠٪ حسب المادة 194J',
      debitAccount: 'Sharma & Co (Creditor)',
      creditAccount: 'TDS Payable',
      amount: 7500,
      explanation: 'Transfer part of the creditor balance to TDS liability.',
      explanationAr: 'تحويل جزء من رصيد الدائن إلى التزام TDS.',
      voiceEn:
        'Section 194J requires us to deduct TDS at 10 percent on professional fees. 10 percent of 75 thousand is 7 thousand 5 hundred. This is money we owe the government, not Sharma and Company. So we debit the creditor — reducing what we owe them — and credit TDS Payable — a new liability to the tax department.',
      voiceAr:
        'تتطلب المادة 194J خصم TDS بنسبة ١٠٪ على الأتعاب المهنية. عشرة بالمائة من ٧٥ ألف هو ٧ آلاف و٥٠٠. هذا مبلغ ندينه للحكومة، ليس لشركة شارما. فنجعل الدائن مدينًا، مما يقلل ما ندينه لهم، ونجعل TDS المستحق دائنًا، وهو التزام جديد لمصلحة الضرائب.',
    },
    {
      id: 'tds3',
      description: 'Pay net amount (75000 - 7500) to Sharma & Co',
      descriptionAr: 'دفع المبلغ الصافي (٧٥٠٠٠ - ٧٥٠٠) لشركة شارما',
      debitAccount: 'Sharma & Co (Creditor)',
      creditAccount: 'Bank A/c',
      amount: 67500,
      explanation: 'Settle the reduced creditor balance — 67,500 to Sharma, 7,500 to govt.',
      explanationAr: 'تسوية رصيد الدائن المخفض — ٦٧٫٥٠٠ لشارما، ٧٫٥٠٠ للحكومة.',
      voiceEn:
        'Now we pay Sharma and Company the net amount. 75 thousand minus the 7 thousand 5 hundred we held back equals 67 thousand 5 hundred. We debit the creditor to clear the remaining balance and credit the bank. Sharma gets what they negotiated for, adjusted for the tax we are depositing on their behalf.',
      voiceAr:
        'الآن ندفع لشركة شارما المبلغ الصافي. ٧٥ ألف ناقص ٧٥٠٠ التي احتجزناها يساوي ٦٧ ألف و٥٠٠. نجعل الدائن مدينًا لتسوية الرصيد المتبقي، ونجعل البنك دائنًا. تحصل شركة شارما على ما اتفقوا عليه، معدلاً بالضريبة التي نودعها نيابة عنهم.',
    },
    {
      id: 'tds4',
      description: 'Deposit TDS with the government',
      descriptionAr: 'إيداع TDS لدى الحكومة',
      debitAccount: 'TDS Payable',
      creditAccount: 'Bank A/c',
      amount: 7500,
      explanation: 'Clear the TDS liability by depositing with the Income Tax Department.',
      explanationAr: 'تسوية التزام TDS بالإيداع لدى مصلحة ضريبة الدخل.',
      voiceEn:
        'By the 7th of next month, we must deposit the TDS we deducted with the Income Tax Department. We debit TDS Payable — clearing that liability — and credit the bank. Sharma and Company can later claim this 7 thousand 5 hundred as a tax credit when they file their own return, using Form 26AS.',
      voiceAr:
        'بحلول السابع من الشهر التالي، يجب علينا إيداع TDS المخصوم لدى مصلحة ضريبة الدخل. نجعل TDS المستحق مدينًا، مما يسوي ذلك الالتزام، ونجعل البنك دائنًا. يمكن لشركة شارما لاحقًا المطالبة بهذا المبلغ كرصيد ضريبي عند تقديم إقرارها الضريبي، باستخدام النموذج 26AS.',
    },
  ],
}

// ─── GST / VAT Input Credit Chain ───────────────────────────

const GST_INPUT_CREDIT: Scenario = {
  title: 'GST Input Credit — Trading Cycle',
  titleAr: 'خصم ضريبة المدخلات GST — دورة التجارة',
  transactions: [
    {
      id: 'g1',
      description: 'Purchase goods worth 1,00,000 + 18% GST',
      descriptionAr: 'شراء بضائع بقيمة ١٠٠٠٠٠ + ١٨٪ GST',
      debitAccount: 'Purchase A/c',
      creditAccount: 'Gupta Suppliers (Creditor)',
      amount: 100000,
      explanation: 'Record the purchase cost exclusive of GST.',
      explanationAr: 'تسجيل تكلفة الشراء بدون GST.',
      voiceEn:
        'We buy goods worth 1 lakh rupees from Gupta Suppliers. The GST is separate. First, we record just the purchase cost of 1 lakh. Debit purchases — an expense — and credit the creditor.',
      voiceAr:
        'اشترينا بضائع بقيمة لاخ روبية من موردي جوبتا. ضريبة GST منفصلة. أولاً، نسجل فقط تكلفة الشراء وهي لاخ واحد. نجعل المشتريات مدينة وهي مصروف، ونجعل الدائن دائنًا.',
    },
    {
      id: 'g2',
      description: 'Record input GST on purchase (18%)',
      descriptionAr: 'تسجيل GST المدخلات على الشراء (١٨٪)',
      debitAccount: 'Input GST (Recoverable)',
      creditAccount: 'Gupta Suppliers (Creditor)',
      amount: 18000,
      explanation: 'Input GST is an asset — recoverable from the government.',
      explanationAr: 'GST المدخلات هو أصل، قابل للاسترداد من الحكومة.',
      voiceEn:
        'Now the GST part — 18 thousand rupees on the purchase. But GST we pay on inputs is not an expense — its an asset. We can reclaim it from the government when we sell goods ourselves. So we debit Input GST as an asset, and credit the creditor for the additional amount owed.',
      voiceAr:
        'الآن جزء GST، ١٨ ألف روبية على الشراء. لكن GST الذي ندفعه على المدخلات ليس مصروفًا، بل أصل. يمكننا استرداده من الحكومة عندما نبيع نحن البضائع. فنجعل GST المدخلات مدينًا كأصل، ونجعل الدائن دائنًا للمبلغ الإضافي المستحق.',
    },
    {
      id: 'g3',
      description: 'Sell goods worth 1,50,000 + 18% GST',
      descriptionAr: 'بيع بضائع بقيمة ١٥٠٠٠٠ + ١٨٪ GST',
      debitAccount: 'ABC Retail (Debtor)',
      creditAccount: 'Sales A/c',
      amount: 150000,
      explanation: 'Record sales revenue exclusive of GST.',
      explanationAr: 'تسجيل إيراد المبيعات بدون GST.',
      voiceEn:
        'We sell the goods to ABC Retail for 1 lakh 50 thousand, earning a 50 thousand margin. GST is again separate. We debit the debtor — money they owe us — and credit sales revenue.',
      voiceAr:
        'نبيع البضائع لشركة ABC للتجزئة بمبلغ لاخ و٥٠ ألف، محققين هامش ربح ٥٠ ألف. GST منفصل مرة أخرى. نجعل المدين مدينًا، وهو المبلغ الذي يدينونه لنا، ونجعل إيراد المبيعات دائنًا.',
    },
    {
      id: 'g4',
      description: 'Record output GST on sale (18%)',
      descriptionAr: 'تسجيل GST المخرجات على البيع (١٨٪)',
      debitAccount: 'ABC Retail (Debtor)',
      creditAccount: 'Output GST (Liability)',
      amount: 27000,
      explanation: 'Output GST is a liability — owed to the government.',
      explanationAr: 'GST المخرجات هو التزام، مستحق للحكومة.',
      voiceEn:
        'GST on the sale is 27 thousand rupees — 18 percent of 1 lakh 50 thousand. This money belongs to the government, not to us. So we debit the debtor — they owe us the extra 27 thousand — and credit Output GST as a liability.',
      voiceAr:
        'GST على البيع هو ٢٧ ألف روبية، ١٨٪ من لاخ و٥٠ ألف. هذا المبلغ ملك للحكومة، ليس لنا. فنجعل المدين مدينًا، يدينون لنا بالـ٢٧ ألف الإضافية، ونجعل GST المخرجات دائنًا كالتزام.',
    },
    {
      id: 'g5',
      description: 'Settle GST liability (Output − Input)',
      descriptionAr: 'تسوية التزام GST (المخرجات − المدخلات)',
      debitAccount: 'Output GST (Liability)',
      creditAccount: 'Input GST (Recoverable)',
      amount: 18000,
      explanation: 'Offset input credit against output liability — 27,000 − 18,000 = 9,000 net.',
      explanationAr: 'مقاصة خصم المدخلات مع التزام المخرجات — ٢٧٫٠٠٠ − ١٨٫٠٠٠ = ٩٫٠٠٠ صافي.',
      voiceEn:
        'Here is where input credit works its magic. We owe output GST of 27 thousand. But we already paid input GST of 18 thousand. We can offset them. We debit Output GST by 18 thousand to reduce what we owe, and credit Input GST to clear the asset. What remains is a 9 thousand net liability to actually pay in cash.',
      voiceAr:
        'هنا يعمل خصم المدخلات سحره. ندين GST مخرجات بقيمة ٢٧ ألف. لكننا دفعنا GST مدخلات بقيمة ١٨ ألف. يمكننا مقاصتهما. نجعل GST المخرجات مدينًا بـ١٨ ألف لتقليل ما ندينه، ونجعل GST المدخلات دائنًا لتسوية الأصل. الباقي هو التزام صافي قدره ٩ آلاف يتعين دفعه نقدًا.',
    },
    {
      id: 'g6',
      description: 'Pay net GST to the government',
      descriptionAr: 'دفع GST الصافي للحكومة',
      debitAccount: 'Output GST (Liability)',
      creditAccount: 'Bank A/c',
      amount: 9000,
      explanation: 'Pay the remaining 9,000 — only the margin is effectively taxed.',
      explanationAr: 'دفع ٩٠٠٠ المتبقية — الهامش فقط يُضرّب فعلياً.',
      voiceEn:
        'By the 20th of next month, we pay 9 thousand rupees to the government. Notice something beautiful — we made a 50 thousand margin and paid GST of only 9 thousand, which is exactly 18 percent of that margin. Thats the magic of GST: only value added at each stage is taxed, avoiding the cascading effect of the old tax regime.',
      voiceAr:
        'بحلول العشرين من الشهر التالي، ندفع ٩ آلاف روبية للحكومة. لاحظ شيئًا جميلاً — حققنا هامش ربح ٥٠ ألفًا ودفعنا GST ٩ آلاف فقط، وهو بالضبط ١٨٪ من ذلك الهامش. هذا هو سحر GST: فقط القيمة المضافة في كل مرحلة تُضرّب، مما يتجنب الأثر المتتالي للنظام الضريبي القديم.',
    },
  ],
}

// ─── ZATCA VAT (KSA) ────────────────────────────────────────

const ZATCA_VAT: Scenario = {
  title: 'Saudi VAT (ZATCA) — 15% Standard Rate',
  titleAr: 'ضريبة القيمة المضافة السعودية (ZATCA) — ١٥٪',
  transactions: [
    {
      id: 'v1',
      description: 'Purchase inventory — SAR 10,000 + 15% VAT',
      descriptionAr: 'شراء مخزون — ١٠٠٠٠ ريال + ١٥٪ VAT',
      debitAccount: 'Purchase A/c',
      creditAccount: 'Supplier',
      amount: 10000,
      explanation: 'Record purchase cost exclusive of VAT.',
      explanationAr: 'تسجيل تكلفة الشراء بدون VAT.',
      voiceEn:
        'We buy inventory worth 10 thousand Saudi Riyals from a local supplier. The VAT is 15 percent on top. We first record the purchase cost of 10 thousand. Debit purchases, credit the supplier.',
      voiceAr:
        'نشتري مخزونًا بقيمة ١٠ آلاف ريال سعودي من مورد محلي. ضريبة القيمة المضافة ١٥٪ فوق ذلك. نسجل أولاً تكلفة الشراء وهي ١٠ آلاف. نجعل المشتريات مدينة والمورد دائنًا.',
    },
    {
      id: 'v2',
      description: 'Record input VAT on purchase',
      descriptionAr: 'تسجيل VAT المدخلات على الشراء',
      debitAccount: 'Input VAT (Recoverable)',
      creditAccount: 'Supplier',
      amount: 1500,
      explanation: 'Input VAT is a recoverable asset under ZATCA rules.',
      explanationAr: 'VAT المدخلات هو أصل قابل للاسترداد حسب قواعد ZATCA.',
      voiceEn:
        'VAT on the purchase is 1 thousand 5 hundred riyals. Under ZATCA rules, this is recoverable — we can offset it against VAT we collect from our customers. We debit Input VAT as an asset and credit the supplier for the additional amount owed.',
      voiceAr:
        'VAT على الشراء ١٥٠٠ ريال. حسب قواعد ZATCA، هذا قابل للاسترداد — يمكننا مقاصته مع VAT الذي نحصّله من عملائنا. نجعل VAT المدخلات مدينًا كأصل، ونجعل المورد دائنًا للمبلغ الإضافي المستحق.',
    },
    {
      id: 'v3',
      description: 'Sell to customer — SAR 15,000 + 15% VAT',
      descriptionAr: 'بيع لعميل — ١٥٠٠٠ ريال + ١٥٪ VAT',
      debitAccount: 'Customer',
      creditAccount: 'Sales A/c',
      amount: 15000,
      explanation: 'Record sales exclusive of VAT.',
      explanationAr: 'تسجيل المبيعات بدون VAT.',
      voiceEn:
        'We sell goods to a customer for 15 thousand riyals. We debit the customer and credit sales revenue. VAT is booked separately next.',
      voiceAr:
        'نبيع بضائع لعميل بمبلغ ١٥ ألف ريال. نجعل العميل مدينًا ونجعل إيراد المبيعات دائنًا. VAT يُسجل بشكل منفصل بعد ذلك.',
    },
    {
      id: 'v4',
      description: 'Record output VAT on sale',
      descriptionAr: 'تسجيل VAT المخرجات على البيع',
      debitAccount: 'Customer',
      creditAccount: 'Output VAT (Liability)',
      amount: 2250,
      explanation: 'VAT collected on behalf of ZATCA — a liability, not income.',
      explanationAr: 'VAT محصّل نيابة عن ZATCA — التزام، ليس إيرادًا.',
      voiceEn:
        'VAT on the sale is 2 thousand 2 hundred 50 riyals — 15 percent of 15 thousand. This is money we are collecting on behalf of ZATCA. It is not our revenue. We debit the customer and credit Output VAT as a liability.',
      voiceAr:
        'VAT على البيع ٢٢٥٠ ريال — ١٥٪ من ١٥ ألف. هذا مبلغ نحصّله نيابة عن ZATCA. ليس إيرادنا. نجعل العميل مدينًا ونجعل VAT المخرجات دائنًا كالتزام.',
    },
    {
      id: 'v5',
      description: 'Settle VAT and pay net to ZATCA',
      descriptionAr: 'تسوية VAT ودفع الصافي لـ ZATCA',
      debitAccount: 'Output VAT (Liability)',
      creditAccount: 'Input VAT (Recoverable)',
      amount: 1500,
      explanation: 'Offset input against output — pay only the net difference.',
      explanationAr: 'مقاصة المدخلات مع المخرجات — ادفع الفرق الصافي فقط.',
      voiceEn:
        'At month end, we offset input VAT against output VAT. Output of 2 thousand 2 hundred 50 minus input of 1 thousand 5 hundred equals 7 hundred 50 riyals net payable. We transfer 1 thousand 5 hundred from output to clear input, and pay the remaining 7 hundred 50 to ZATCA through the Fatoora portal.',
      voiceAr:
        'في نهاية الشهر، نقاص VAT المدخلات مع VAT المخرجات. المخرجات ٢٢٥٠ ناقص المدخلات ١٥٠٠ يساوي ٧٥٠ ريال صافي مستحق الدفع. ننقل ١٥٠٠ من المخرجات لتسوية المدخلات، وندفع ٧٥٠ المتبقية لـ ZATCA عبر بوابة فاتورة.',
    },
  ],
}

// ─── Scenario lookup ────────────────────────────────────────

/**
 * Pick the best visualizer scenario for a given lesson slug.
 * Falls back to the generic double-entry basics if no match.
 */
export function pickScenario(slug: string): Scenario {
  const s = slug.toLowerCase()

  if (s.includes('ifrs16') || s.includes('ifrs-16') || s.includes('lease')) return IFRS16
  if (s.includes('depreciation') || s.includes('fixed-asset') || s.includes('ppe')) {
    return DEPRECIATION
  }
  if (s.includes('tds') || s.includes('withholding')) return TDS
  if (s.includes('zatca') || s.includes('ksa-vat') || s.includes('saudi-vat')) return ZATCA_VAT
  if (s.includes('gst') || s.includes('input-credit') || s.includes('input-tax')) {
    return GST_INPUT_CREDIT
  }

  return BASICS
}
