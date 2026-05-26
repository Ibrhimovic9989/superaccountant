import { Building2 } from 'lucide-react'
import { redirect } from 'next/navigation'
import { auth, signIn } from '@/lib/auth'

/**
 * Sign-in for employers. Google + email magic link, same accounts as
 * the main app. Server-action driven (no client JS needed).
 */
export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ check?: string; error?: string }>
}) {
  const session = await auth()
  if (session?.user?.id) redirect('/')
  const sp = await searchParams

  async function googleSignIn() {
    'use server'
    await signIn('google', { redirectTo: '/' })
  }
  async function emailSignIn(formData: FormData) {
    'use server'
    const email = String(formData.get('email') ?? '').trim()
    if (!email) return
    await signIn('nodemailer', { email, redirectTo: '/' })
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <div className="mb-3 inline-flex items-center gap-2 self-start rounded-full border border-accent/30 bg-accent-soft px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-accent">
        <Building2 className="h-3 w-3" />
        SuperAccountant for Employers
      </div>
      <h1 className="text-3xl font-semibold tracking-tight">Sign in to hire</h1>
      <p className="mt-2 text-sm text-fg-muted">
        Post roles and review applicants from SuperAccountant cohort graduates who&apos;ve cleared
        the grand test.
      </p>

      {sp.check && (
        <p className="mt-4 rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">
          Check your inbox for a sign-in link.
        </p>
      )}
      {sp.error && (
        <p className="mt-4 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          Sign-in failed. Try again.
        </p>
      )}

      <form action={googleSignIn} className="mt-8">
        <button
          type="submit"
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-bg-elev px-5 py-3 text-sm font-medium hover:bg-bg-overlay"
        >
          Continue with Google
        </button>
      </form>

      <div className="my-5 flex items-center gap-3 text-xs text-fg-subtle">
        <span className="h-px flex-1 bg-border" />
        or
        <span className="h-px flex-1 bg-border" />
      </div>

      <form action={emailSignIn} className="space-y-3">
        <input
          type="email"
          name="email"
          required
          placeholder="you@company.com"
          className="block w-full rounded-lg border border-border bg-bg-elev px-4 py-3 text-sm outline-none placeholder:text-fg-subtle focus:border-accent"
        />
        <button
          type="submit"
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-medium text-accent-fg hover:bg-accent/90"
        >
          Email me a sign-in link
        </button>
      </form>
    </main>
  )
}
