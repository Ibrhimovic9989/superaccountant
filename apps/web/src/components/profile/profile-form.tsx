import { ArrowRight, Briefcase, Target, User as UserIcon } from 'lucide-react'
import { SubmitButton } from '@/components/ui/loading'

export type ProfileFormData = {
  name: string | null
  phone: string | null
  country: string | null
  city: string | null
  currentRole: string | null
  currentEmployer: string | null
  experienceYears: number | null
  examGoal: string | null
  studyHoursPerWeek: number | null
  targetExamDate: string | null
  motivation: string | null
}

type Props = {
  locale: 'en' | 'ar'
  market: 'india' | 'ksa'
  email: string
  initial: ProfileFormData
  action: (formData: FormData) => Promise<void>
  ctaLabel: string
  ctaPendingLabel: string
  variant?: 'setup' | 'edit'
}

const COPY = {
  en: {
    sectionPersonal: 'Personal',
    sectionProfessional: 'Professional',
    sectionGoals: 'Goals',
    name: 'Full name',
    namePlaceholder: 'Aisha Al-Rashid',
    email: 'Email',
    phone: 'Phone',
    phonePlaceholder: '+966 50 123 4567',
    country: 'Country',
    city: 'City',
    cityPlaceholder: 'Riyadh',
    currentRole: 'Current role',
    currentRolePlaceholder: 'Junior accountant, CA student, audit associate…',
    currentEmployer: 'Current employer',
    currentEmployerOptional: '(optional)',
    employerPlaceholder: 'Firm or company',
    experience: 'Years of experience',
    experiencePlaceholder: '0',
    examGoal: 'What are you preparing for?',
    examGoalIndia: ['CA Foundation', 'CA Intermediate', 'CA Final', 'CMA', 'CS', 'ACCA', 'Just learning'],
    examGoalKsa: ['SOCPA', 'IFRS Diploma', 'ACCA', 'CMA', 'ZATCA exam', 'Just learning'],
    studyHours: 'Hours you can study per week',
    targetDate: 'Target exam date (optional)',
    motivation: 'Why are you here? (optional)',
    motivationPlaceholder:
      "What do you want to get out of this? The tutor will use this to personalize your experience.",
  },
  ar: {
    sectionPersonal: 'شخصي',
    sectionProfessional: 'مهني',
    sectionGoals: 'الأهداف',
    name: 'الاسم الكامل',
    namePlaceholder: 'عائشة الراشد',
    email: 'البريد الإلكتروني',
    phone: 'الهاتف',
    phonePlaceholder: '+966 50 123 4567',
    country: 'الدولة',
    city: 'المدينة',
    cityPlaceholder: 'الرياض',
    currentRole: 'الدور الحالي',
    currentRolePlaceholder: 'محاسب مبتدئ، طالب CA، مساعد مراجعة…',
    currentEmployer: 'جهة العمل الحالية',
    currentEmployerOptional: '(اختياري)',
    employerPlaceholder: 'شركة أو مؤسسة',
    experience: 'سنوات الخبرة',
    experiencePlaceholder: '0',
    examGoal: 'لماذا تستعد؟',
    examGoalIndia: ['CA الأساسي', 'CA المتوسط', 'CA النهائي', 'CMA', 'CS', 'ACCA', 'للتعلم فقط'],
    examGoalKsa: ['SOCPA', 'دبلوم IFRS', 'ACCA', 'CMA', 'امتحان ZATCA', 'للتعلم فقط'],
    studyHours: 'ساعات الدراسة في الأسبوع',
    targetDate: 'تاريخ الامتحان المستهدف (اختياري)',
    motivation: 'لماذا أنت هنا؟ (اختياري)',
    motivationPlaceholder:
      'ماذا تريد أن تحصل عليه من هذا؟ سيستخدم المدرس هذا لتخصيص تجربتك.',
  },
} as const

export function ProfileForm({
  locale,
  market,
  email,
  initial,
  action,
  ctaLabel,
  ctaPendingLabel,
}: Props) {
  const t = COPY[locale]
  const examGoals = market === 'india' ? t.examGoalIndia : t.examGoalKsa
  const defaultCountry =
    initial.country ?? (market === 'india' ? (locale === 'ar' ? 'الهند' : 'India') : locale === 'ar' ? 'السعودية' : 'Saudi Arabia')

  return (
    <form action={action} className="space-y-10">
      {/* ── Personal ─────────────────────────────────────── */}
      <section>
        <SectionHeader icon={<UserIcon className="h-3 w-3" />} title={t.sectionPersonal} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t.name}>
            <input
              name="name"
              required
              defaultValue={initial.name ?? ''}
              placeholder={t.namePlaceholder}
              className={inputCls}
            />
          </Field>
          <Field label={t.email}>
            <input
              type="email"
              value={email}
              disabled
              className={`${inputCls} cursor-not-allowed text-fg-muted`}
            />
          </Field>
          <Field label={t.phone}>
            <input
              name="phone"
              type="tel"
              defaultValue={initial.phone ?? ''}
              placeholder={t.phonePlaceholder}
              className={inputCls}
            />
          </Field>
          <Field label={t.country}>
            <input
              name="country"
              defaultValue={defaultCountry}
              required
              className={inputCls}
            />
          </Field>
          <Field label={t.city}>
            <input
              name="city"
              defaultValue={initial.city ?? ''}
              placeholder={t.cityPlaceholder}
              className={inputCls}
            />
          </Field>
        </div>
      </section>

      {/* ── Professional ─────────────────────────────────── */}
      <section>
        <SectionHeader icon={<Briefcase className="h-3 w-3" />} title={t.sectionProfessional} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t.currentRole}>
            <input
              name="currentRole"
              defaultValue={initial.currentRole ?? ''}
              placeholder={t.currentRolePlaceholder}
              className={inputCls}
            />
          </Field>
          <Field label={`${t.currentEmployer} ${t.currentEmployerOptional}`}>
            <input
              name="currentEmployer"
              defaultValue={initial.currentEmployer ?? ''}
              placeholder={t.employerPlaceholder}
              className={inputCls}
            />
          </Field>
          <Field label={t.experience}>
            <input
              name="experienceYears"
              type="number"
              min={0}
              max={50}
              defaultValue={initial.experienceYears ?? ''}
              placeholder={t.experiencePlaceholder}
              className={inputCls}
            />
          </Field>
        </div>
      </section>

      {/* ── Goals ────────────────────────────────────────── */}
      <section>
        <SectionHeader icon={<Target className="h-3 w-3" />} title={t.sectionGoals} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t.examGoal} className="sm:col-span-2">
            <div className="flex flex-wrap gap-2">
              {examGoals.map((g) => (
                <label
                  key={g}
                  className="group inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-bg-elev px-3 py-2 text-sm transition-all hover:border-border-strong has-[:checked]:border-accent has-[:checked]:bg-accent-soft"
                >
                  <input
                    type="radio"
                    name="examGoal"
                    value={g}
                    defaultChecked={initial.examGoal === g}
                    className="sr-only"
                  />
                  <span>{g}</span>
                </label>
              ))}
            </div>
          </Field>
          <Field label={t.studyHours}>
            <input
              name="studyHoursPerWeek"
              type="number"
              min={1}
              max={60}
              defaultValue={initial.studyHoursPerWeek ?? ''}
              placeholder="5"
              className={inputCls}
            />
          </Field>
          <Field label={t.targetDate}>
            <input
              name="targetExamDate"
              type="date"
              defaultValue={initial.targetExamDate ?? ''}
              className={inputCls}
            />
          </Field>
          <Field label={t.motivation} className="sm:col-span-2">
            <textarea
              name="motivation"
              rows={3}
              defaultValue={initial.motivation ?? ''}
              placeholder={t.motivationPlaceholder}
              className={`${inputCls} resize-none`}
            />
          </Field>
        </div>
      </section>

      <div className="flex justify-end pt-4">
        <SubmitButton variant="accent" size="lg" pendingLabel={ctaPendingLabel}>
          {ctaLabel}
          <ArrowRight className="h-4 w-4 rtl:rotate-180" />
        </SubmitButton>
      </div>
    </form>
  )
}

const inputCls =
  'block w-full rounded-lg border border-border bg-bg-elev px-4 py-2.5 text-sm text-fg outline-none transition-colors placeholder:text-fg-subtle focus:border-accent'

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="mb-5 flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
      <span className="inline-flex h-5 w-5 items-center justify-center rounded-md border border-border bg-bg-elev text-accent">
        {icon}
      </span>
      {title}
    </div>
  )
}

function Field({
  label,
  className,
  children,
}: {
  label: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={className}>
      <label className="mb-2 block font-mono text-[10px] uppercase tracking-wider text-fg-muted">
        {label}
      </label>
      {children}
    </div>
  )
}
