import type { JobWithCompany } from '@/lib/careers/store'
import type { SupportedLocale } from '@sa/i18n'

/**
 * Server component that emits two JSON-LD blobs:
 *   1. JobPosting — eats by Google for Jobs. Maps our internal Job
 *      shape onto schema.org's required + recommended fields.
 *   2. BreadcrumbList — Home → Jobs → {title}. Helps Google render
 *      breadcrumbs in SERPs instead of raw URLs.
 *
 * Stays server-rendered (no `'use client'`) so it ships as static HTML
 * and the crawler sees it on first paint.
 */

const SITE_URL = (process.env.NEXTAUTH_URL ?? 'https://app.superaccountant.in').replace(/\/$/, '')

const EMPLOYMENT_TYPE_MAP: Record<string, string> = {
  'full-time': 'FULL_TIME',
  'part-time': 'PART_TIME',
  contract: 'CONTRACTOR',
  internship: 'INTERN',
}

type Props = {
  job: JobWithCompany
  locale: SupportedLocale
}

export function JobPostingJsonLd({ job, locale }: Props) {
  const jobUrl = `${SITE_URL}/${locale}/jobs/${job.id}`
  // Schema.org needs `validThrough` ISO date. We default to publishedAt + 60d
  // if the job hasn't been closed, since we don't store an explicit expiry.
  const publishedIso = job.publishedAt.toISOString()
  const validThrough =
    job.closedAt?.toISOString() ??
    new Date(job.publishedAt.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString()

  const baseSalary =
    job.salaryCurrency && (job.salaryMinMinor !== null || job.salaryMaxMinor !== null)
      ? {
          '@type': 'MonetaryAmount',
          currency: job.salaryCurrency,
          value: {
            '@type': 'QuantitativeValue',
            ...(job.salaryMinMinor !== null ? { minValue: job.salaryMinMinor / 100 } : {}),
            ...(job.salaryMaxMinor !== null ? { maxValue: job.salaryMaxMinor / 100 } : {}),
            unitText: 'YEAR',
          },
        }
      : undefined

  const jobPosting: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: job.title,
    description: job.description,
    datePosted: publishedIso,
    validThrough,
    employmentType: EMPLOYMENT_TYPE_MAP[job.employmentType] ?? 'OTHER',
    hiringOrganization: {
      '@type': 'Organization',
      name: job.companyName,
      sameAs: `${SITE_URL}/${locale}/jobs?company=${encodeURIComponent(job.companySlug)}`,
      ...(job.companyLogoUrl ? { logo: job.companyLogoUrl } : {}),
    },
    jobLocation: {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        addressLocality: job.city,
        ...(job.state ? { addressRegion: job.state } : {}),
        ...(job.postalCode ? { postalCode: job.postalCode } : {}),
        addressCountry: job.country,
      },
    },
    ...(job.remoteAllowed
      ? {
          jobLocationType: 'TELECOMMUTE',
          applicantLocationRequirements: {
            '@type': 'Country',
            name: job.country,
          },
        }
      : {}),
    ...(baseSalary ? { baseSalary } : {}),
    directApply: false,
    url: jobUrl,
  }

  const breadcrumbs = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: `${SITE_URL}/${locale}`,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Jobs',
        item: `${SITE_URL}/${locale}/jobs`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: job.title,
        item: jobUrl,
      },
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: server-rendered, static JSON-LD
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jobPosting) }}
      />
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: server-rendered, static JSON-LD
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />
    </>
  )
}
