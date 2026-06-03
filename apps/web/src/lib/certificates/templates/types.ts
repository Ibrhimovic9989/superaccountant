import type { ReactElement } from 'react'

/**
 * Shared types + utilities for the certificate template catalogue.
 *
 * Every concrete template (classic-navy, ornate-cream, tech-cert-aws,
 * tech-cert-azure, tech-cert-gcp) exports a React component conforming to
 * the `TemplateComponent` signature and is registered in `./index.ts`.
 *
 * Layer rule: this file is leaf — it must not import any concrete template
 * to avoid registry cycles. Concrete templates import from here.
 */

/** Identifier for every registered design. Adding a new id requires only
 *  a new file + a registry entry — never a change to the orchestrator. */
export type TemplateId =
  | 'classic-navy'
  | 'ornate-cream'
  | 'tech-cert-aws'
  | 'tech-cert-azure'
  | 'tech-cert-gcp'

export type CertificateTemplate = {
  /** Optional design id; defaults to `'classic-navy'` for backwards-compat. */
  templateId?: TemplateId
  title: string
  /** Body text with `{{name}}` placeholder for the recipient.
   *  Separate paragraphs with `\n\n`. */
  bodyTemplate: string
  issuerName: string
  issuerRole?: string | null
  /** ISO date string (YYYY-MM-DD). */
  issueDate: string
  /** Hex color like '#1e3a5f'. Templates that use a fixed palette may
   *  ignore this. */
  accentColor?: string | null
  /** Optional venue/city — renders "Held on {date} in {location}." line. */
  location?: string | null
  /** Optional "held on" date if different from issueDate. ISO YYYY-MM-DD. */
  heldOn?: string | null
}

export type CertificateData = {
  recipientName: string
  verifyUrl: string
}

export type TemplateComponentProps = {
  template: CertificateTemplate
  data: CertificateData
}

export type TemplateComponent = (props: TemplateComponentProps) => ReactElement

export type TemplateInfo = {
  id: TemplateId
  /** Human-readable label rendered in the picker. */
  name: string
  /** One-line summary for the picker card. */
  description: string
  /** Optional badge, e.g. "Program completions". */
  recommended?: string
  Component: TemplateComponent
}

/** Interpolate `{{name}}` / `{{recipient}}` in the body template. Reused
 *  by every template so the placeholder grammar stays in one place. */
export function interpolate(template: string, recipientName: string): string {
  return template
    .replace(/\{\{\s*name\s*\}\}/g, recipientName)
    .replace(/\{\{\s*recipient\s*\}\}/g, recipientName)
}

/** Format an ISO YYYY-MM-DD date as `DD Month YYYY` in en-GB. Falls back
 *  to the raw string on parse failure so the document is never blank. */
export function formatDate(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00Z`)
  if (Number.isNaN(d.getTime())) return isoDate
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

/** Compose the optional "Held on {date} in {location}." line. Returns
 *  null when neither held-on date nor location is configured. */
export function heldOnLine(template: CertificateTemplate): string | null {
  const heldOnDate = template.heldOn ?? template.issueDate
  if (!template.location || !heldOnDate) return null
  return `Held on ${formatDate(heldOnDate)} in ${template.location}.`
}

/** Split a body string on blank lines, collapse internal newlines to
 *  spaces, drop empties. Stable order — paragraphs render top-down. */
export function splitParagraphs(body: string): string[] {
  return body
    .split(/\n{2,}/)
    .map((p) => p.replace(/\n/g, ' ').trim())
    .filter((p) => p.length > 0)
}
