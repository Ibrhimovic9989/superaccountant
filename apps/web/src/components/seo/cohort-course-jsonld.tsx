import type { Cohort } from '@/lib/cohort/store'
import type { SupportedLocale } from '@sa/i18n'

/**
 * Course + CourseInstance JSON-LD for the cohort marketing page.
 * Google's `Course` rich result rewards pages that declare provider,
 * `hasCourseInstance` with `courseMode` ('Onsite' / 'Blended'), and
 * a price. We emit one Course schema with one instance per active
 * cohort.
 *
 * Fully server-rendered.
 */

const SITE_URL = (process.env.NEXTAUTH_URL ?? 'https://app.superaccountant.in').replace(/\/$/, '')

type Props = {
  cohorts: Cohort[]
  locale: SupportedLocale
}

export function CohortCourseJsonLd({ cohorts, locale }: Props) {
  const provider = {
    '@type': 'Organization',
    name: 'SuperAccountant',
    sameAs: SITE_URL,
  }

  const courseInstances = cohorts.map((c) => ({
    '@type': 'CourseInstance',
    courseMode: 'Blended',
    courseSchedule: {
      '@type': 'Schedule',
      duration: `P${c.durationDays}D`,
      repeatFrequency: 'Daily',
      repeatCount: c.durationDays,
    },
    startDate: c.startDate.toISOString().slice(0, 10),
    ...(c.city
      ? {
          location: {
            '@type': 'Place',
            name: c.city,
            address: {
              '@type': 'PostalAddress',
              addressLocality: c.city,
              addressCountry: c.track === 'india' ? 'IN' : 'SA',
            },
          },
        }
      : {}),
    offers: {
      '@type': 'Offer',
      url: `${SITE_URL}/${locale}/cohort`,
      price: (c.discountedPriceMinor / 100).toFixed(2),
      priceCurrency: c.currency,
      availability:
        c.status === 'open' ? 'https://schema.org/InStock' : 'https://schema.org/SoldOut',
    },
    inLanguage: locale === 'ar' ? 'ar' : 'en',
  }))

  const course = {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: 'SuperAccountant Get-Job-Ready Cohort',
    description:
      'A 45-day offline accounting cohort with AI tutor support, covering Tally Prime, GST + TDS for India and ZATCA + VAT for KSA, plus interview and placement prep.',
    provider,
    inLanguage: ['en', 'ar', 'hi'],
    ...(courseInstances.length > 0 ? { hasCourseInstance: courseInstances } : {}),
    url: `${SITE_URL}/${locale}/cohort`,
  }

  return (
    <script
      type="application/ld+json"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: server-rendered, static JSON-LD
      dangerouslySetInnerHTML={{ __html: JSON.stringify(course) }}
    />
  )
}
