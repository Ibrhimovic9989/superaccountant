import { ShieldCheck } from 'lucide-react'
import { redirect } from 'next/navigation'
import { auth, signIn } from '@/lib/auth'
import { isUserAdmin } from '@/lib/auth/admin-gate'

/**
 * Editorial team sign-in. Google + email magic link, same accounts as
 * the main app. Server-action driven (no client JS needed).
 *
 * On success we send the user straight to /admin if they're an admin,
 * otherwise we sign them back out and surface a friendly "admin only"
 * message — the public reading surface doesn't need an account.
 */
export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ check?: string; error?: string }>
}) {
  const session = await auth()
  if (session?.user?.id) {
    const admin = await isUserAdmin(session.user.id)
    if (admin) redirect('/admin')
  }
  const sp = await searchParams

  async function googleSignIn() {
    'use server'
    await signIn('google', { redirectTo: '/admin' })
  }
  async function emailSignIn(formData: FormData) {
    'use server'
    const email = String(formData.get('email') ?? '').trim()
    if (!email) return
    await signIn('nodemailer', { email, redirectTo: '/admin' })
  }

  const adminOnly = sp.error === 'admin-only'

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-6 py-12">
      <div className="mb-3 inline-flex items-center gap-2 self-start rounded-full border border-accent/30 bg-accent-soft px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-accent">
        <ShieldCheck className="h-3 w-3" />
        Editorial — admin only
      </div>
      <h1 className="text-3xl font-semibold tracking-tight">Sign in to the blog</h1>
      <p className="mt-2 text-sm text-fg-muted">
        The SuperAccountant blog is open to read. Admin sign-in is only for the editorial team
        to manage posts and the research queue.
      </p>

      {sp.check && (
        <p className="mt-4 rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">
          Check your inbox for a sign-in link.
        </p>
      )}
      {adminOnly && (
        <p className="mt-4 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning">
          This surface is admin-only. If you&apos;re an editor, ask Ibrahim to grant access.
        </p>
      )}
      {sp.error && !adminOnly && (
        <p className="mt-4 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          Sign-in failed. Try again.
        </p>
      )}

      <form action={googleSignIn} className="mt-8">
        <button
          type="submit"
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-bg px-5 py-3 text-sm font-medium hover:bg-bg-overlay"
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
          placeholder="you@superaccountant.in"
          className="block w-full rounded-lg border border-border bg-bg px-4 py-3 text-sm outline-none placeholder:text-fg-subtle focus:border-accent"
        />
        <button
          type="submit"
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-medium text-accent-fg hover:opacity-90"
        >
          Email me a sign-in link
        </button>
      </form>
    </main>
  )
}
