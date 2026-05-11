'use client'

import { cn } from '@/lib/utils'
import {
  ArrowRight,
  Award,
  CheckCircle2,
  Download,
  ExternalLink,
  FileText,
  Loader2,
  Upload,
  Users,
  X,
} from 'lucide-react'
import { useMemo, useState, useTransition } from 'react'

export type GenerateRequest = {
  template: {
    title: string
    bodyTemplate: string
    issuerName: string
    issuerRole: string | null
    issueDate: string
    accentColor: string | null
  }
  recipients: { name: string; email: string | null }[]
}

export type GenerateResult = {
  batchId: string
  issued: {
    id: string
    recipientName: string
    recipientEmail: string | null
    pdfUrl: string
    verifyHash: string
  }[]
  failures: { recipientName: string; error: string }[]
}

type Props = {
  generate: (req: GenerateRequest) => Promise<GenerateResult>
}

const DEFAULT_BODY =
  "For successfully completing the Superaccountant program — demonstrating strong fundamentals in accounting practice, GST compliance, and bookkeeping discipline.\n\nAwarded in recognition of {{name}}'s commitment, effort, and the standards they upheld throughout."

const ACCENT_OPTIONS: { value: string; label: string }[] = [
  { value: '#7c3aed', label: 'Purple' },
  { value: '#0ea5e9', label: 'Sky' },
  { value: '#10b981', label: 'Emerald' },
  { value: '#f59e0b', label: 'Amber' },
  { value: '#e11d48', label: 'Rose' },
  { value: '#0f172a', label: 'Slate' },
]

export function CertificateBuilder({ generate }: Props) {
  const today = new Date().toISOString().slice(0, 10)

  const [title, setTitle] = useState('Certificate of Completion')
  const [body, setBody] = useState(DEFAULT_BODY)
  const [issuerName, setIssuerName] = useState('')
  const [issuerRole, setIssuerRole] = useState('Program Director')
  const [issueDate, setIssueDate] = useState(today)
  const [accent, setAccent] = useState(ACCENT_OPTIONS[0]?.value ?? '#7c3aed')
  const [recipientsRaw, setRecipientsRaw] = useState('')
  const [csvFileName, setCsvFileName] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<GenerateResult | null>(null)
  const [pending, startTransition] = useTransition()

  const recipients = useMemo(() => parseRecipients(recipientsRaw), [recipientsRaw])

  function handleCsvUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 1_000_000) {
      setError('CSV too large — keep it under 1 MB (~10k rows).')
      return
    }
    setError(null)
    setCsvFileName(file.name)
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = String(ev.target?.result ?? '')
      // Replace the textarea content entirely so the user sees what was parsed.
      setRecipientsRaw(text.trim())
    }
    reader.readAsText(file)
  }

  function clearCsv() {
    setCsvFileName(null)
    setRecipientsRaw('')
  }

  function submit() {
    setError(null)
    if (title.trim().length < 3) {
      setError('Certificate title is required.')
      return
    }
    if (!body.includes('{{name}}') && !body.includes('{{recipient}}')) {
      setError('Body must include {{name}} so each certificate is personalised.')
      return
    }
    if (issuerName.trim().length < 2) {
      setError('Issuer name is required.')
      return
    }
    if (recipients.length === 0) {
      setError('Add at least one recipient.')
      return
    }
    if (recipients.length > 500) {
      setError('Max 500 recipients per batch.')
      return
    }
    startTransition(async () => {
      try {
        const res = await generate({
          template: {
            title: title.trim(),
            bodyTemplate: body.trim(),
            issuerName: issuerName.trim(),
            issuerRole: issuerRole.trim() || null,
            issueDate,
            accentColor: accent,
          },
          recipients,
        })
        setResult(res)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Generation failed — try again.')
      }
    })
  }

  // ── Results screen ──────────────────────────────────────────
  if (result) {
    return <ResultScreen result={result} onReset={() => setResult(null)} />
  }

  // ── Builder form ────────────────────────────────────────────
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      {/* ── Left: template + recipients ── */}
      <div className="space-y-8">
        <section className="rounded-2xl border border-border bg-bg-elev/50 p-6 sm:p-8">
          <SectionHeader icon={<FileText className="h-3 w-3" />} title="Template" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Certificate title" className="sm:col-span-2">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Certificate of Completion"
                className={inputCls}
              />
            </Field>
            <Field label="Body text" className="sm:col-span-2">
              <p className="-mt-1 mb-2 text-xs text-fg-muted">
                Use{' '}
                <code className="rounded bg-bg-overlay px-1 py-0.5 text-[11px]">{'{{name}}'}</code>{' '}
                where the recipient&apos;s name should appear. Two paragraphs max for best layout.
              </p>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={6}
                className={`${inputCls} resize-none font-mono text-xs leading-relaxed`}
              />
            </Field>
            <Field label="Issuer name">
              <input
                value={issuerName}
                onChange={(e) => setIssuerName(e.target.value)}
                placeholder="Razam Ali"
                className={inputCls}
              />
            </Field>
            <Field label="Issuer role">
              <input
                value={issuerRole}
                onChange={(e) => setIssuerRole(e.target.value)}
                placeholder="Program Director"
                className={inputCls}
              />
            </Field>
            <Field label="Issue date">
              <input
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Accent colour">
              <div className="flex flex-wrap gap-2">
                {ACCENT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setAccent(opt.value)}
                    title={opt.label}
                    className={cn(
                      'inline-flex h-9 w-9 items-center justify-center rounded-lg border-2 transition-all',
                      accent === opt.value
                        ? 'border-fg'
                        : 'border-border hover:border-border-strong',
                    )}
                    style={{ backgroundColor: opt.value }}
                  >
                    {accent === opt.value && <CheckCircle2 className="h-4 w-4 text-white" />}
                  </button>
                ))}
              </div>
            </Field>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-bg-elev/50 p-6 sm:p-8">
          <SectionHeader icon={<Users className="h-3 w-3" />} title="Recipients" />
          <p className="-mt-3 mb-4 text-xs text-fg-muted">
            Paste names one per line, or <strong>Name,Email</strong> per line. Or upload a CSV file
            with name and email columns.
          </p>

          <div className="mb-3 flex items-center gap-2">
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-bg-elev px-3 py-2 text-xs font-medium text-fg-muted transition-colors hover:bg-bg-overlay hover:text-fg">
              <Upload className="h-3.5 w-3.5" />
              {csvFileName ?? 'Upload CSV'}
              <input
                type="file"
                accept=".csv,.txt,text/csv,text/plain"
                onChange={handleCsvUpload}
                className="hidden"
              />
            </label>
            {csvFileName && (
              <button
                type="button"
                onClick={clearCsv}
                className="inline-flex items-center gap-1 rounded-lg border border-border bg-bg-elev px-2 py-2 text-xs text-fg-subtle transition-colors hover:bg-bg-overlay hover:text-fg"
                title="Clear"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            <span className="ms-auto font-mono text-[11px] uppercase tracking-wider text-fg-subtle">
              {recipients.length} parsed
            </span>
          </div>

          <textarea
            value={recipientsRaw}
            onChange={(e) => {
              setRecipientsRaw(e.target.value)
              setCsvFileName(null)
            }}
            rows={10}
            placeholder={
              'Aisha Sharma\nRahul Mehta, rahul@example.com\nFatima Khan, fatima@example.com'
            }
            className={`${inputCls} resize-y font-mono text-xs leading-relaxed`}
          />

          {recipients.length > 0 && (
            <div className="mt-4 max-h-48 overflow-auto rounded-lg border border-border bg-bg-overlay/30">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-bg-elev/95 backdrop-blur">
                  <tr>
                    <th className="px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
                      #
                    </th>
                    <th className="px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
                      Name
                    </th>
                    <th className="px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
                      Email
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recipients.slice(0, 100).map((r, i) => (
                    <tr key={`${r.name}-${i}`} className="border-t border-border">
                      <td className="px-3 py-1.5 font-mono text-fg-subtle">{i + 1}</td>
                      <td className="px-3 py-1.5 font-medium text-fg">{r.name}</td>
                      <td className="px-3 py-1.5 text-fg-muted">{r.email ?? '—'}</td>
                    </tr>
                  ))}
                  {recipients.length > 100 && (
                    <tr className="border-t border-border">
                      <td colSpan={3} className="px-3 py-2 text-center text-fg-subtle">
                        + {recipients.length - 100} more not shown
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* ── Right: preview + CTA ── */}
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="rounded-2xl border border-border bg-bg-elev/50 p-6">
          <SectionHeader icon={<Award className="h-3 w-3" />} title="Preview (first recipient)" />
          <PreviewCard
            title={title}
            body={body}
            issuerName={issuerName || '—'}
            issuerRole={issuerRole || ''}
            issueDate={issueDate}
            accent={accent}
            sampleName={recipients[0]?.name ?? 'Aisha Sharma'}
          />

          {error && (
            <p className="mt-4 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={submit}
            disabled={pending || recipients.length === 0}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3.5 text-sm font-medium text-bg transition-colors hover:bg-accent/90 disabled:opacity-60"
          >
            {pending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating {recipients.length}…
              </>
            ) : (
              <>
                Generate {recipients.length || 0} certificate
                {recipients.length === 1 ? '' : 's'}
                <ArrowRight className="h-4 w-4 rtl:rotate-180" />
              </>
            )}
          </button>

          <p className="mt-3 text-center text-[10px] text-fg-subtle">
            PDFs stored on Supabase. Public URLs returned for download.
          </p>
        </div>
      </aside>
    </div>
  )
}

// ── Sub-components + helpers ─────────────────────────────────────

function PreviewCard({
  title,
  body,
  issuerName,
  issuerRole,
  issueDate,
  accent,
  sampleName,
}: {
  title: string
  body: string
  issuerName: string
  issuerRole: string
  issueDate: string
  accent: string
  sampleName: string
}) {
  const formattedDate = (() => {
    const d = new Date(`${issueDate}T00:00:00Z`)
    if (Number.isNaN(d.getTime())) return issueDate
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    })
  })()
  const previewBody = body
    .replace(/\{\{\s*name\s*\}\}/g, sampleName)
    .replace(/\{\{\s*recipient\s*\}\}/g, sampleName)
  return (
    <div
      className="mt-3 rounded-xl border-2 bg-white p-4 text-slate-900"
      style={{ borderColor: accent }}
    >
      <div className="mb-3 h-1.5 w-1/3" style={{ backgroundColor: accent }} />
      <p className="font-mono text-[8px] uppercase tracking-widest text-slate-500">
        SUPERACCOUNTANT
      </p>
      <h3 className="mt-1 text-lg font-bold leading-tight">{title || '—'}</h3>
      <p className="mt-3 text-[10px] text-slate-500">This certificate is proudly presented to</p>
      <p className="mt-1 text-xl font-bold" style={{ color: accent }}>
        {sampleName}
      </p>
      <p className="mt-3 line-clamp-4 text-[10px] leading-snug text-slate-700">{previewBody}</p>
      <div className="mt-4 flex items-end justify-between text-[9px]">
        <div>
          <div className="w-24 border-t border-slate-300 pt-1 font-bold">{issuerName}</div>
          {issuerRole && <div className="text-slate-500">{issuerRole}</div>}
        </div>
        <div className="text-end">
          <div className="text-slate-500">ISSUED</div>
          <div className="font-bold">{formattedDate}</div>
        </div>
      </div>
    </div>
  )
}

function ResultScreen({ result, onReset }: { result: GenerateResult; onReset: () => void }) {
  const total = result.issued.length + result.failures.length
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-success/30 bg-success/5 p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-6 w-6 text-success" />
          <h2 className="text-2xl font-semibold tracking-tight">
            {result.issued.length} certificate{result.issued.length === 1 ? '' : 's'} issued
          </h2>
        </div>
        <p className="mt-2 text-sm text-fg-muted">
          {result.issued.length} of {total} succeeded.
          {result.failures.length > 0 && ` ${result.failures.length} failed.`} Batch ID:{' '}
          <code className="rounded bg-bg-overlay px-1.5 py-0.5 font-mono text-xs">
            {result.batchId.slice(0, 8)}
          </code>
        </p>
        <button
          type="button"
          onClick={onReset}
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-border bg-bg-elev px-3 py-2 text-xs text-fg-muted transition-colors hover:bg-bg-overlay hover:text-fg"
        >
          Start a new batch
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-bg-elev/40">
        <table className="w-full text-left text-sm">
          <thead className="bg-bg-overlay/40">
            <tr>
              <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
                Recipient
              </th>
              <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
                Email
              </th>
              <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
                PDF
              </th>
              <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
                Verify
              </th>
            </tr>
          </thead>
          <tbody>
            {result.issued.map((c) => (
              <tr key={c.id} className="border-t border-border">
                <td className="px-4 py-2.5 font-medium text-fg">{c.recipientName}</td>
                <td className="px-4 py-2.5 text-fg-muted">{c.recipientEmail ?? '—'}</td>
                <td className="px-4 py-2.5">
                  <a
                    href={c.pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 font-medium text-accent hover:underline"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download
                  </a>
                </td>
                <td className="px-4 py-2.5">
                  <code className="rounded bg-bg-overlay px-1.5 py-0.5 font-mono text-xs text-fg-muted">
                    {c.verifyHash.slice(0, 8)}
                  </code>
                </td>
              </tr>
            ))}
            {result.failures.map((f) => (
              <tr key={f.recipientName} className="border-t border-border bg-danger/5">
                <td className="px-4 py-2.5 font-medium text-fg">{f.recipientName}</td>
                <td className="px-4 py-2.5 text-danger" colSpan={3}>
                  {f.error}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
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
      <div className="mb-2 block font-mono text-[10px] uppercase tracking-wider text-fg-muted">
        {label}
      </div>
      {children}
    </div>
  )
}

/**
 * Parse recipients from the textarea. Each non-empty line becomes one
 * recipient. Supports plain names OR `Name, Email` format. Strips a CSV
 * header row if present (line 1 contains literal "name" or "email").
 */
function parseRecipients(raw: string): { name: string; email: string | null }[] {
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
  if (lines.length === 0) return []
  const first = lines[0]?.toLowerCase() ?? ''
  const start = first.includes('name') && first.includes(',') ? 1 : 0
  const out: { name: string; email: string | null }[] = []
  for (let i = start; i < lines.length; i++) {
    const line = lines[i]
    if (!line) continue
    const parts = line.split(',').map((p) => p.trim())
    const name = parts[0]
    if (!name) continue
    const email = parts[1] && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(parts[1]) ? parts[1] : null
    out.push({ name, email })
  }
  return out
}
