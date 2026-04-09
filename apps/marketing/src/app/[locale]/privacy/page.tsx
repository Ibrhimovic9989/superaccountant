import type { SupportedLocale } from '@sa/i18n'
import { LegalDoc } from '@/components/legal-doc'

export const metadata = {
  title: 'Privacy Policy · SuperAccountant',
  description: 'How SuperAccountant collects, uses, and protects your data.',
}

const COPY = {
  en: {
    eyebrow: 'Legal',
    title: 'Privacy policy',
    lastUpdated: '8 April 2026',
  },
  ar: {
    eyebrow: 'قانوني',
    title: 'سياسة الخصوصية',
    lastUpdated: '٨ أبريل ٢٠٢٦',
  },
} as const

export default async function PrivacyPage({
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
        SuperAccountant Technologies ("we", "us") cares about your privacy. This policy explains
        what data we collect, why we collect it, who we share it with, and how to control it. It
        covers our website, the SuperAccountant app, and the verification page.
      </p>

      <h2>1. Data we collect</h2>
      <p>We collect the minimum data needed to operate the Service. Specifically:</p>
      <ul>
        <li>
          <strong>Account data</strong> — your name, email, and (if you sign in with Google) your
          profile photo. Required to create an account.
        </li>
        <li>
          <strong>Profile data</strong> — phone, country, city, current role, employer,
          experience, exam goal, study hours, target exam date, and your free-text "why are you
          here" answer. You provide this during onboarding to personalize the tutor.
        </li>
        <li>
          <strong>Learning data</strong> — your placement test answers, lesson progress, practice
          attempts, mastery scores, daily plans, and grand test results.
        </li>
        <li>
          <strong>Tutor messages</strong> — every message you send to the AI tutor and every reply
          it generates, plus the tools it called and what it remembered.
        </li>
        <li>
          <strong>Operational data</strong> — IP address, device info, browser locale, and basic
          server logs (timestamp, route, status code). Used for debugging and abuse prevention.
        </li>
      </ul>
      <p>
        We do <strong>not</strong> collect government IDs, payment card numbers (until paid plans
        launch), or any data we don't actively need.
      </p>

      <h2>2. How we use it</h2>
      <ul>
        <li>To run the Service — log you in, render lessons, generate plans, grade attempts.</li>
        <li>
          To <strong>personalize your experience</strong> — your profile fields are passed into
          the tutor's system prompt so it addresses you by name, calibrates explanations to your
          experience level, and respects your study budget and exam timeline.
        </li>
        <li>
          To improve the curriculum — we look at aggregate (de-identified) patterns of which
          questions students get wrong and which lessons need clearer wording.
        </li>
        <li>To send transactional email — sign-in links, certificate notifications.</li>
        <li>To prevent abuse, fraud, and security incidents.</li>
      </ul>
      <p>
        We do not sell your data. We do not use your data to train third-party AI models. Your
        tutor messages are not used to train our own models without your explicit opt-in.
      </p>

      <h2>3. Who we share it with</h2>
      <p>
        We share data only with the service providers we need to operate. Each is bound by their
        own data processing agreement.
      </p>
      <ul>
        <li>
          <strong>Supabase</strong> (Singapore region) — primary database and authentication
          tokens. Stores all account, profile, learning, and tutor data.
        </li>
        <li>
          <strong>Microsoft Azure (OpenAI)</strong> — runs the language model that powers the
          tutor. Your messages are sent for completion. Microsoft does not retain them for
          training and offers content filtering.
        </li>
        <li>
          <strong>Microsoft Azure (Document Intelligence + Speech)</strong> — used for OCR on
          uploaded documents and text-to-speech for lesson narration.
        </li>
        <li>
          <strong>Resend</strong> — sends transactional email (sign-in links, certificate
          notifications).
        </li>
        <li>
          <strong>Google</strong> — only if you sign in with Google. We receive your name, email,
          and profile photo from Google's OAuth response.
        </li>
        <li>
          <strong>Vercel</strong> — hosts the web frontend. Receives standard HTTP request logs.
        </li>
      </ul>

      <h2>4. Where it lives</h2>
      <p>
        Most data is stored on Supabase servers in Singapore. Azure OpenAI inference happens in
        the East US region. Email is sent via Resend's US infrastructure. By using the Service,
        you consent to your data being processed in these locations.
      </p>

      <h2>5. How long we keep it</h2>
      <ul>
        <li>Account + profile data: until you delete your account.</li>
        <li>Learning data + certificates: until you delete your account, or 7 years, whichever is shorter.</li>
        <li>Tutor messages: 12 months by default. Older messages are automatically purged.</li>
        <li>Server logs: 30 days.</li>
      </ul>

      <h2>6. Your rights</h2>
      <p>You have the right to:</p>
      <ul>
        <li>
          <strong>Access</strong> — see what data we hold about you. Available from your profile
          page or by emailing us.
        </li>
        <li>
          <strong>Correct</strong> — fix anything inaccurate, directly from your profile page.
        </li>
        <li>
          <strong>Delete</strong> — remove your account and all associated data. The delete
          button on the profile page does this immediately.
        </li>
        <li>
          <strong>Export</strong> — download a copy of your account, profile, and learning data
          as JSON. Email us to request this.
        </li>
        <li>
          <strong>Object</strong> — opt out of any non-essential processing.
        </li>
      </ul>
      <p>To exercise any of these, email info@superaccountant.in. We respond within 30 days.</p>

      <h2>7. Children</h2>
      <p>
        SuperAccountant is not intended for users under 16. If you believe a child has created an
        account, email us and we will delete it.
      </p>

      <h2>8. Cookies</h2>
      <p>
        We use a small number of essential cookies — a session cookie to keep you logged in, a
        theme cookie to remember your dark/light preference, and a locale cookie to remember your
        language. We do not use third-party tracking cookies.
      </p>

      <h2>9. Security</h2>
      <p>
        Passwords are not stored — we use email magic links and Google OAuth. Data in transit is
        encrypted with TLS. Data at rest is encrypted by Supabase. Certificates are HMAC-signed
        to prevent tampering. We do not have access to your Google or email account.
      </p>

      <h2>10. Changes</h2>
      <p>
        We may update this policy as the Service evolves. Material changes will be announced via
        email at least 14 days in advance. The "last updated" date above always reflects the
        current version.
      </p>

      <h2>11. Contact</h2>
      <p>
        Questions or requests? Email{' '}
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
        تهتم شركة سوبر أكاونتنت تكنولوجيز ("نحن") بخصوصيتك. تشرح هذه السياسة ما هي البيانات التي
        نجمعها، ولماذا نجمعها، ومع من نشاركها، وكيف يمكنك التحكم بها.
      </p>

      <h2>١. البيانات التي نجمعها</h2>
      <p>نجمع الحد الأدنى من البيانات اللازمة لتشغيل الخدمة:</p>
      <ul>
        <li>
          <strong>بيانات الحساب</strong> — اسمك وبريدك الإلكتروني وصورة ملفك الشخصي (إذا سجلت
          عبر Google).
        </li>
        <li>
          <strong>بيانات الملف الشخصي</strong> — الهاتف، البلد، المدينة، الدور الحالي، جهة
          العمل، الخبرة، الهدف من الامتحان، ساعات الدراسة، تاريخ الامتحان المستهدف، وإجابتك
          النصية الحرة "لماذا أنت هنا".
        </li>
        <li>
          <strong>بيانات التعلم</strong> — إجابات اختبار التحديد، تقدمك في الدروس، محاولات
          التمارين، درجات الإتقان، الخطط اليومية، ونتائج الاختبار الكبير.
        </li>
        <li>
          <strong>رسائل المدرس</strong> — كل رسالة ترسلها للمدرس الذكي وكل رد يولّده.
        </li>
        <li>
          <strong>البيانات التشغيلية</strong> — عنوان IP، معلومات الجهاز، وسجلات الخادم
          الأساسية. تُستخدم لتصحيح الأخطاء ومنع إساءة الاستخدام.
        </li>
      </ul>
      <p>
        نحن <strong>لا</strong> نجمع الهويات الحكومية ولا أرقام بطاقات الدفع ولا أي بيانات لا
        نحتاجها فعلياً.
      </p>

      <h2>٢. كيف نستخدمها</h2>
      <ul>
        <li>لتشغيل الخدمة — تسجيل دخولك، عرض الدروس، توليد الخطط، تصحيح المحاولات.</li>
        <li>
          لـ<strong>تخصيص تجربتك</strong> — تُمرَّر حقول ملفك الشخصي إلى تعليمات المدرس بحيث
          يخاطبك بالاسم، ويعاير الشروحات حسب مستوى خبرتك، ويحترم ميزانيتك الدراسية.
        </li>
        <li>لتحسين المنهج — ننظر إلى أنماط مجمّعة (مجهولة الهوية) للأسئلة التي يخطئ فيها الطلاب.</li>
        <li>لإرسال البريد الإلكتروني المعاملاتي — روابط تسجيل الدخول، إشعارات الشهادات.</li>
        <li>لمنع إساءة الاستخدام والاحتيال والحوادث الأمنية.</li>
      </ul>
      <p>
        نحن لا نبيع بياناتك. نحن لا نستخدم بياناتك لتدريب نماذج ذكاء اصطناعي تابعة لجهات خارجية.
      </p>

      <h2>٣. مع من نشاركها</h2>
      <ul>
        <li>
          <strong>Supabase</strong> (سنغافورة) — قاعدة البيانات الأساسية ورموز المصادقة.
        </li>
        <li>
          <strong>Microsoft Azure (OpenAI)</strong> — يشغل النموذج اللغوي للمدرس. لا تحتفظ
          مايكروسوفت برسائلك للتدريب.
        </li>
        <li>
          <strong>Microsoft Azure (Document Intelligence + Speech)</strong> — للتعرف الضوئي على
          المستندات وتحويل النص إلى كلام.
        </li>
        <li>
          <strong>Resend</strong> — يرسل البريد الإلكتروني المعاملاتي.
        </li>
        <li>
          <strong>Google</strong> — فقط إذا سجلت عبر Google. نتلقى اسمك وبريدك وصورتك من استجابة
          OAuth.
        </li>
        <li>
          <strong>Vercel</strong> — يستضيف الواجهة الأمامية.
        </li>
      </ul>

      <h2>٤. أين تُخزَّن</h2>
      <p>
        معظم البيانات مخزنة على خوادم Supabase في سنغافورة. استدلال Azure OpenAI يحدث في منطقة
        شرق الولايات المتحدة. باستخدامك للخدمة، فإنك توافق على معالجة بياناتك في هذه المواقع.
      </p>

      <h2>٥. كم نحتفظ بها</h2>
      <ul>
        <li>بيانات الحساب والملف الشخصي: حتى تحذف حسابك.</li>
        <li>بيانات التعلم والشهادات: حتى تحذف حسابك، أو ٧ سنوات، أيهما أقصر.</li>
        <li>رسائل المدرس: ١٢ شهراً افتراضياً. تُحذف الرسائل الأقدم تلقائياً.</li>
        <li>سجلات الخادم: ٣٠ يوماً.</li>
      </ul>

      <h2>٦. حقوقك</h2>
      <p>لديك الحق في:</p>
      <ul>
        <li>
          <strong>الوصول</strong> — رؤية البيانات التي نحتفظ بها عنك.
        </li>
        <li>
          <strong>التصحيح</strong> — تصحيح أي شيء غير دقيق من صفحة ملفك الشخصي.
        </li>
        <li>
          <strong>الحذف</strong> — إزالة حسابك وكل البيانات المرتبطة به.
        </li>
        <li>
          <strong>التصدير</strong> — تنزيل نسخة من بياناتك بصيغة JSON.
        </li>
        <li>
          <strong>الاعتراض</strong> — الانسحاب من أي معالجة غير ضرورية.
        </li>
      </ul>
      <p>لممارسة أي من هذه، راسل info@superaccountant.in. نرد خلال ٣٠ يوماً.</p>

      <h2>٧. الأطفال</h2>
      <p>
        سوبر أكاونتنت غير مخصص للمستخدمين دون سن ١٦. إذا اعتقدت أن طفلاً قد أنشأ حساباً، راسلنا
        وسنحذفه.
      </p>

      <h2>٨. الكوكيز</h2>
      <p>
        نستخدم عدداً قليلاً من الكوكيز الأساسية — كوكي جلسة لإبقائك مسجلاً، كوكي للوضع الداكن،
        كوكي للغة. لا نستخدم كوكيز تتبع تابعة لجهات خارجية.
      </p>

      <h2>٩. الأمان</h2>
      <p>
        لا نخزن كلمات المرور — نستخدم روابط بريدية سحرية و Google OAuth. البيانات أثناء النقل
        مشفرة بـ TLS. البيانات الساكنة مشفرة بواسطة Supabase. الشهادات موقعة بـ HMAC لمنع
        التلاعب.
      </p>

      <h2>١٠. التغييرات</h2>
      <p>
        قد نحدّث هذه السياسة. سيتم الإعلان عن التغييرات الجوهرية عبر البريد الإلكتروني قبل ١٤
        يوماً على الأقل.
      </p>

      <h2>١١. اتصل بنا</h2>
      <p>
        أسئلة أو طلبات؟ راسل{' '}
        <a href="mailto:info@superaccountant.in">info@superaccountant.in</a> أو اكتب إلى: شركة
        سوبر أكاونتنت تكنولوجيز، وحدة 422، الطابق الرابع، داون تاون مول، لاكديكابول، حيدر آباد،
        الهند.
      </p>
    </>
  )
}
