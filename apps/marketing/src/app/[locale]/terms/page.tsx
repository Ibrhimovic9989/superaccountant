import { LegalDoc } from '@/components/legal-doc'
import type { SupportedLocale } from '@sa/i18n'

export const metadata = {
  title: 'Terms of Use · SuperAccountant',
  description: 'The terms governing your use of SuperAccountant.',
}

const COPY = {
  en: {
    eyebrow: 'Legal',
    title: 'Terms of use',
    lastUpdated: '8 April 2026',
  },
  ar: {
    eyebrow: 'قانوني',
    title: 'شروط الاستخدام',
    lastUpdated: '٨ أبريل ٢٠٢٦',
  },
} as const

export default async function TermsPage({
  params,
}: {
  params: Promise<{ locale: SupportedLocale }>
}) {
  const { locale } = await params
  const t = COPY[locale]
  return (
    <LegalDoc locale={locale} eyebrow={t.eyebrow} title={t.title} lastUpdated={t.lastUpdated}>
      {locale === 'ar' ? <ArabicBody /> : <EnglishBody />}
    </LegalDoc>
  )
}

function EnglishBody() {
  return (
    <>
      <p>
        These terms govern your access to and use of SuperAccountant (the "Service"), operated by
        SuperAccountant Technologies, registered in Hyderabad, India. By creating an account or
        using the Service, you agree to these terms. If you don't agree, please don't use the
        Service.
      </p>

      <h2>1. What SuperAccountant is</h2>
      <p>
        SuperAccountant is an educational technology platform for accounting students and
        practitioners in India and Saudi Arabia. We provide bilingual lessons, an AI tutor, daily
        practice plans, and certificates of mastery. We are <strong>not</strong> a regulator, an
        accounting firm, or a substitute for professional advice. Nothing on the Service is official
        tax, legal, or audit advice.
      </p>

      <h2>2. Your account</h2>
      <p>
        You must be at least 16 years old to create an account. You're responsible for keeping your
        login credentials secure and for all activity under your account. Don't share your account.
        If you suspect unauthorized access, email us immediately at info@superaccountant.in.
      </p>

      <h2>3. Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Scrape, mirror, or republish lesson content without written permission.</li>
        <li>
          Reverse-engineer the AI tutor or attempt to extract its underlying prompts, weights, or
          training data.
        </li>
        <li>Use the Service to generate content that violates Indian or Saudi law.</li>
        <li>
          Submit false information during registration, profile setup, or assessments — your
          certificate is only meaningful if your answers are your own.
        </li>
        <li>Resell or commercially exploit access without an enterprise agreement.</li>
      </ul>

      <h2>4. AI-generated content</h2>
      <p>
        The AI tutor is trained on our curriculum and is grounded in cited lessons, but it can still
        make mistakes. Treat its output as a study aid, not as a final authoritative source. Always
        verify regulatory facts (tax rates, section numbers, due dates) against the official source
        before relying on them in real work.
      </p>

      <h2>5. Certificates</h2>
      <p>
        Certificates issued by SuperAccountant verify that you completed our internal assessment.
        They are <strong>not</strong> a regulator-issued license and do not replace ICAI, SOCPA, or
        any other professional credential. Each certificate is HMAC-signed and verifiable on our
        public verification page; counterfeit certificates are void.
      </p>

      <h2>6. Intellectual property</h2>
      <p>
        All curriculum content, lessons, diagrams, code, and brand marks are owned by
        SuperAccountant Technologies. You receive a personal, non-transferable license to use them
        for your own learning. The license ends when your account closes.
      </p>
      <p>
        Content you submit (answers, profile data, tutor messages) remains yours. By submitting it,
        you grant us a license to store, process, and use it to operate and improve the Service —
        including grading your answers and personalizing your tutor.
      </p>

      <h2>7. Subscriptions and refunds</h2>
      <p>
        During beta, the Service is free. When paid plans launch, billing details will be shown
        clearly before any charge. If you cancel, you keep access until the end of your current
        billing period. Refunds are handled case-by-case — email us if something feels wrong.
      </p>

      <h2>8. Disclaimers</h2>
      <p>
        The Service is provided "as is" without warranties of any kind. We don't guarantee that the
        AI tutor will be available 24/7, that lessons will be free of errors, or that you will pass
        any external exam. Your professional success depends on many things beyond what we can
        offer.
      </p>

      <h2>9. Limitation of liability</h2>
      <p>
        To the maximum extent permitted by law, SuperAccountant Technologies is not liable for
        indirect, incidental, or consequential damages arising from your use of the Service. Our
        total liability for any claim is limited to the amount you paid us in the 12 months
        preceding the claim, or ₹1,000, whichever is greater.
      </p>

      <h2>10. Account termination</h2>
      <p>
        You can delete your account at any time from the profile settings. We may suspend or
        terminate accounts that violate these terms, with notice when reasonably possible.
      </p>

      <h2>11. Governing law</h2>
      <p>
        These terms are governed by the laws of India. Any dispute will be resolved in the courts of
        Hyderabad, Telangana.
      </p>

      <h2>12. Changes</h2>
      <p>
        We may update these terms as the Service evolves. Material changes will be announced via
        email and on this page at least 14 days before they take effect. Continued use after the
        effective date means you accept the new terms.
      </p>

      <h2>13. Contact</h2>
      <p>
        Questions about these terms? Email{' '}
        <a href="mailto:info@superaccountant.in">info@superaccountant.in</a> or write to:
        SuperAccountant Technologies, Unit 422, 4th floor, Downtown Mall, Lakdikapul, Hyderabad,
        India.
      </p>
    </>
  )
}

function ArabicBody() {
  return (
    <>
      <p>
        تحكم هذه الشروط وصولك إلى سوبر أكاونتنت ("الخدمة") واستخدامك لها، التي تشغّلها شركة سوبر
        أكاونتنت تكنولوجيز، المسجلة في حيدر آباد، الهند. بإنشائك حساباً أو استخدامك للخدمة، فإنك
        توافق على هذه الشروط. إذا لم توافق، فيرجى عدم استخدام الخدمة.
      </p>

      <h2>١. ما هو سوبر أكاونتنت</h2>
      <p>
        سوبر أكاونتنت منصة تعليمية لطلاب وممارسي المحاسبة في الهند والمملكة العربية السعودية. نقدم
        دروساً ثنائية اللغة، ومدرساً ذكياً، وخططاً يومية للممارسة، وشهادات إتقان. نحن{' '}
        <strong>لسنا</strong> جهة تنظيمية، ولا شركة محاسبة، ولا بديلاً عن المشورة المهنية. لا شيء في
        الخدمة يُعتبر مشورة ضريبية أو قانونية أو تدقيقية رسمية.
      </p>

      <h2>٢. حسابك</h2>
      <p>
        يجب أن يكون عمرك ١٦ عاماً على الأقل لإنشاء حساب. أنت مسؤول عن الحفاظ على بيانات تسجيل الدخول
        الخاصة بك وعن جميع الأنشطة تحت حسابك. لا تشارك حسابك. إذا اشتبهت في وصول غير مصرح به، راسلنا
        فوراً على info@superaccountant.in.
      </p>

      <h2>٣. الاستخدام المقبول</h2>
      <p>توافق على عدم:</p>
      <ul>
        <li>كشط أو نسخ أو إعادة نشر محتوى الدروس بدون إذن خطي.</li>
        <li>
          الهندسة العكسية للمدرس الذكي أو محاولة استخراج تعليماته الأساسية أو أوزانه أو بياناته
          التدريبية.
        </li>
        <li>استخدام الخدمة لإنتاج محتوى ينتهك القانون الهندي أو السعودي.</li>
        <li>
          تقديم معلومات كاذبة أثناء التسجيل أو إعداد الملف الشخصي أو الاختبارات — شهادتك ذات معنى
          فقط إذا كانت إجاباتك من عملك أنت.
        </li>
        <li>إعادة بيع أو الاستغلال التجاري للوصول بدون اتفاقية مؤسسية.</li>
      </ul>

      <h2>٤. المحتوى المُولَّد بالذكاء الاصطناعي</h2>
      <p>
        المدرس الذكي مدرَّب على منهجنا ومستند إلى دروس مستشهد بها، لكنه لا يزال قد يخطئ. تعامل مع
        مخرجاته كأداة دراسية، لا كمصدر مرجعي نهائي. تحقق دائماً من الحقائق التنظيمية (معدلات الضرائب،
        أرقام المواد، تواريخ الاستحقاق) من المصدر الرسمي قبل الاعتماد عليها في العمل الحقيقي.
      </p>

      <h2>٥. الشهادات</h2>
      <p>
        الشهادات الصادرة من سوبر أكاونتنت تثبت أنك أكملت تقييمنا الداخلي. وهي <strong>ليست</strong>{' '}
        رخصة من جهة تنظيمية ولا تحل محل ICAI أو SOCPA أو أي شهادة مهنية أخرى. كل شهادة موقعة بـ HMAC
        وقابلة للتحقق على صفحة التحقق العامة؛ الشهادات المزورة لاغية.
      </p>

      <h2>٦. الملكية الفكرية</h2>
      <p>
        جميع محتويات المنهج والدروس والرسوم البيانية والكود وعلامات الهوية مملوكة لشركة سوبر
        أكاونتنت تكنولوجيز. تحصل على ترخيص شخصي غير قابل للتحويل لاستخدامها للتعلم الخاص بك. ينتهي
        الترخيص عند إغلاق حسابك.
      </p>
      <p>
        المحتوى الذي تقدمه (الإجابات، بيانات الملف الشخصي، رسائل المدرس) يبقى ملكك. بتقديمه، تمنحنا
        ترخيصاً لتخزينه ومعالجته واستخدامه لتشغيل الخدمة وتحسينها — بما في ذلك تصحيح إجاباتك وتخصيص
        مدرسك.
      </p>

      <h2>٧. الاشتراكات والاسترداد</h2>
      <p>
        خلال النسخة التجريبية، الخدمة مجانية. عند إطلاق الخطط المدفوعة، ستظهر تفاصيل الفوترة بوضوح
        قبل أي خصم. إذا ألغيت، فإنك تحتفظ بالوصول حتى نهاية فترة الفوترة الحالية. يتم التعامل مع
        الاسترداد على أساس كل حالة على حدة.
      </p>

      <h2>٨. إخلاء المسؤولية</h2>
      <p>
        تُقدَّم الخدمة "كما هي" بدون أي ضمانات. لا نضمن أن المدرس الذكي سيكون متاحاً ٢٤/٧، أو أن الدروس
        ستكون خالية من الأخطاء، أو أنك ستجتاز أي امتحان خارجي.
      </p>

      <h2>٩. حدود المسؤولية</h2>
      <p>
        إلى أقصى حد يسمح به القانون، شركة سوبر أكاونتنت تكنولوجيز ليست مسؤولة عن الأضرار غير
        المباشرة أو العرضية أو التبعية الناشئة عن استخدامك للخدمة. مسؤوليتنا الإجمالية لأي مطالبة
        محدودة بالمبلغ الذي دفعته لنا في الـ ١٢ شهراً السابقة للمطالبة، أو ١٬٠٠٠ روبية، أيهما أكبر.
      </p>

      <h2>١٠. إنهاء الحساب</h2>
      <p>
        يمكنك حذف حسابك في أي وقت من إعدادات الملف الشخصي. قد نعلق أو ننهي الحسابات التي تنتهك هذه
        الشروط، مع إشعار عندما يكون ذلك ممكناً.
      </p>

      <h2>١١. القانون الحاكم</h2>
      <p>تخضع هذه الشروط لقوانين الهند. أي نزاع سيُحل في محاكم حيدر آباد، تيلانجانا.</p>

      <h2>١٢. التغييرات</h2>
      <p>
        قد نحدث هذه الشروط مع تطور الخدمة. سيتم الإعلان عن التغييرات الجوهرية عبر البريد الإلكتروني
        وعلى هذه الصفحة قبل ١٤ يوماً على الأقل من سريانها.
      </p>

      <h2>١٣. اتصل بنا</h2>
      <p>
        أسئلة حول هذه الشروط؟ راسل{' '}
        <a href="mailto:info@superaccountant.in">info@superaccountant.in</a> أو اكتب إلى: شركة سوبر
        أكاونتنت تكنولوجيز، وحدة 422، الطابق الرابع، داون تاون مول، لاكديكابول، حيدر آباد، الهند.
      </p>
    </>
  )
}
