import Link from 'next/link'
import { FileText, LayoutDashboard, Lightbulb, LogOut } from 'lucide-react'
import { signOut } from '@/lib/auth'
import { requireAdmin } from '@/lib/auth/admin-gate'

/**
 * Admin shell. Mounts under /admin/* and gates the entire subtree on
 * IdentityUser.role='admin'. If a server action elsewhere calls
 * redirect to /sign-in, the gate is re-enforced on the next request.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin()

  async function doSignOut() {
    'use server'
    await signOut({ redirectTo: '/' })
  }

  return (
    <div className="mx-auto flex max-w-6xl gap-8 px-6 py-10">
      <aside className="hidden w-48 shrink-0 md:block">
        <p className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">Admin</p>
        <nav className="mt-3 space-y-1 text-sm">
          <AdminNavLink href="/admin" label="Overview" icon={<LayoutDashboard className="h-3.5 w-3.5" />} />
          <AdminNavLink href="/admin/posts" label="Posts" icon={<FileText className="h-3.5 w-3.5" />} />
          <AdminNavLink href="/admin/topics" label="Topic queue" icon={<Lightbulb className="h-3.5 w-3.5" />} />
        </nav>
        <form action={doSignOut} className="mt-8">
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 text-xs text-fg-subtle hover:text-fg"
          >
            <LogOut className="h-3 w-3" /> Sign out
          </button>
        </form>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}

function AdminNavLink({
  href,
  label,
  icon,
}: {
  href: string
  label: string
  icon: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-fg-muted hover:bg-bg-soft hover:text-fg"
    >
      {icon}
      {label}
    </Link>
  )
}
