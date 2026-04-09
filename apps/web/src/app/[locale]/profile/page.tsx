import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { Settings2 } from 'lucide-react'
import { auth, signOut } from '@/lib/auth'
import type { SupportedLocale } from '@sa/i18n'
import { AppNav } from '@/components/app-nav'
import { BlurFade } from '@/components/magicui/blur-fade'
import { ProfileForm, type ProfileFormData } from '@/components/profile/profile-form'
import { ProfileDangerZone } from '@/components/profile/profile-danger-zone'
import {
  deleteUserAccount,
  exportUserData,
  getUserProfile,
  resetUserTrack,
  updateUserProfile,
} from '@/lib/data/profile'

const COPY = {
  en: {
    eyebrow: 'Profile',
    title: 'Your profile',
    subtitle:
      'These details shape how the tutor talks to you, what it recommends, and how it grades your work.',
  },
  ar: {
    eyebrow: 'الملف الشخصي',
    title: 'ملفك الشخصي',
    subtitle: 'هذه التفاصيل تحدد كيف يتحدث المدرس معك، وماذا يوصي، وكيف يصحح عملك.',
  },
} as const

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ locale: SupportedLocale }>
}) {
  const { locale } = await params
  const session = await auth()
  if (!session?.user?.id) redirect(`/${locale}/sign-in`)
  const userId = session.user.id

  const u = await getUserProfile(userId)
  if (!u?.preferredTrack) redirect(`/${locale}/welcome`)

  const market = u.preferredTrack
  const t = COPY[locale]

  const initial: ProfileFormData = {
    name: u.profile.name ?? session.user.name ?? null,
    phone: u.profile.phone,
    country: u.profile.country,
    city: u.profile.city,
    currentRole: u.profile.currentRole,
    currentEmployer: u.profile.currentEmployer,
    experienceYears: u.profile.experienceYears,
    examGoal: u.profile.examGoal,
    studyHoursPerWeek: u.profile.studyHoursPerWeek,
    targetExamDate: u.profile.targetExamDate ? toDateInput(u.profile.targetExamDate) : null,
    motivation: u.profile.motivation,
  }

  async function save(formData: FormData) {
    'use server'
    const data = parseFormData(formData)
    await updateUserProfile(userId, data)
    revalidatePath(`/${locale}/profile`)
  }

  async function switchTrack() {
    'use server'
    await resetUserTrack(userId)
    redirect(`/${locale}/welcome`)
  }

  async function exportData() {
    'use server'
    const data = await exportUserData(userId)
    const stamp = new Date().toISOString().slice(0, 10)
    return {
      filename: `superaccountant-export-${stamp}.json`,
      json: JSON.stringify(data, null, 2),
    }
  }

  async function deleteAccount() {
    'use server'
    await deleteUserAccount(userId)
    await signOut({ redirectTo: `/${locale}/sign-in` })
  }

  return (
    <div className="min-h-screen bg-bg text-fg">
      <AppNav
        locale={locale}
        userName={session.user.name ?? null}
        userEmail={session.user.email ?? ''}
      />
      <main className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
        <BlurFade delay={0.05}>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-border bg-bg-elev px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-fg-muted">
            <Settings2 className="h-3 w-3 text-accent" />
            {t.eyebrow}
          </div>
        </BlurFade>
        <BlurFade delay={0.1}>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">{t.title}</h1>
        </BlurFade>
        <BlurFade delay={0.15}>
          <p className="mt-4 max-w-xl text-base text-fg-muted">{t.subtitle}</p>
        </BlurFade>

        <BlurFade delay={0.22}>
          <div className="mt-10 rounded-2xl border border-border bg-bg-elev/50 p-6 backdrop-blur sm:p-8">
            <ProfileForm
              locale={locale}
              market={market}
              email={session.user.email ?? ''}
              initial={initial}
              action={save}
              variant="edit"
              ctaLabel={locale === 'ar' ? 'حفظ التغييرات' : 'Save changes'}
              ctaPendingLabel={locale === 'ar' ? 'جارٍ الحفظ…' : 'Saving…'}
            />
          </div>
        </BlurFade>

        <BlurFade delay={0.28}>
          <ProfileDangerZone
            locale={locale}
            market={market}
            switchTrackAction={switchTrack}
            exportDataAction={exportData}
            deleteAccountAction={deleteAccount}
          />
        </BlurFade>
      </main>
    </div>
  )
}

function parseFormData(fd: FormData) {
  const str = (k: string) => {
    const v = String(fd.get(k) ?? '').trim()
    return v.length > 0 ? v : null
  }
  const num = (k: string) => {
    const v = str(k)
    if (!v) return null
    const n = Number(v)
    return Number.isFinite(n) ? n : null
  }
  const date = (k: string) => {
    const v = str(k)
    if (!v) return null
    const d = new Date(v)
    return Number.isNaN(d.getTime()) ? null : d
  }
  return {
    name: str('name'),
    phone: str('phone'),
    country: str('country'),
    city: str('city'),
    currentRole: str('currentRole'),
    currentEmployer: str('currentEmployer'),
    experienceYears: num('experienceYears'),
    examGoal: str('examGoal'),
    studyHoursPerWeek: num('studyHoursPerWeek'),
    targetExamDate: date('targetExamDate'),
    motivation: str('motivation'),
  }
}

function toDateInput(d: Date | string): string {
  const date = d instanceof Date ? d : new Date(d)
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString().slice(0, 10)
}
