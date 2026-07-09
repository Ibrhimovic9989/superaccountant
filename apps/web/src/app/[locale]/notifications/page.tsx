import { AtSign, Award, Heart, MessageSquare, UserPlus } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AppNav } from '@/components/app-nav'
import { PageBackdrop } from '@/components/page-backdrop'
import { auth } from '@/lib/auth'
import { listNotifications, markAllRead } from '@/lib/community/notification-store'
import type { NotificationRow, NotificationType } from '@/lib/community/notification-store'

/**
 * /notifications — inbox of everything that happened around the
 * viewer. Marks all as read on load — simpler + friendlier than per-
 * row tracking, and matches the "the bell shows counts, this page
 * shows history" mental model.
 */

export const dynamic = 'force-dynamic'

type PageParams = { locale: 'en' | 'ar' }

const TYPE_META: Record<
  NotificationType,
  { icon: typeof Heart; label: string; tone: string }
> = {
  like: {
    icon: Heart,
    label: 'liked your post',
    tone: 'text-rose-300 bg-rose-500/10',
  },
  comment: {
    icon: MessageSquare,
    label: 'commented on your post',
    tone: 'text-blue-300 bg-blue-500/10',
  },
  follow: {
    icon: UserPlus,
    label: 'started following you',
    tone: 'text-emerald-300 bg-emerald-500/10',
  },
  'milestone-post': {
    icon: Award,
    label: 'Your achievement went live',
    tone: 'text-indigo-300 bg-indigo-500/10',
  },
  mention: {
    icon: AtSign,
    label: 'mentioned you',
    tone: 'text-orange-300 bg-orange-500/10',
  },
}

function timeAgo(iso: string): string {
  const t = new Date(iso).getTime()
  const min = Math.round((Date.now() - t) / 60_000)
  if (min < 1) return 'now'
  if (min < 60) return `${min}m`
  const h = Math.round(min / 60)
  if (h < 24) return `${h}h`
  return `${Math.round(h / 24)}d`
}

export default async function NotificationsPage({
  params,
}: {
  params: Promise<PageParams>
}) {
  const { locale } = await params
  const session = await auth()
  if (!session?.user?.id) redirect(`/${locale}/sign-in`)

  const notifications = await listNotifications(session.user.id, 50)
  // Fire-and-forget mark-all-read. If this fails the bell just stays
  // at its old count until the next page load — no big deal.
  markAllRead(session.user.id).catch(() => {})

  return (
    <div className="relative min-h-screen bg-bg text-fg">
      <PageBackdrop />
      <AppNav
        locale={locale}
        userName={session.user.name ?? null}
        userEmail={session.user.email ?? ''}
      />

      <main className="relative mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-10">
        <header className="mb-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-fg-subtle">
            Inbox
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
            Notifications
          </h1>
        </header>

        {notifications.length === 0 ? (
          <EmptyState />
        ) : (
          <ul className="space-y-2">
            {notifications.map((n) => (
              <NotificationItem key={n.id} n={n} locale={locale} />
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}

function NotificationItem({
  n,
  locale,
}: {
  n: NotificationRow
  locale: 'en' | 'ar'
}) {
  const meta = TYPE_META[n.type]
  const Icon = meta.icon

  // Figure out the click target: post-detail for post/comment
  // notifications; profile for follow.
  const href = (() => {
    if (n.subjectType === 'post' && n.subjectId) return `/${locale}/p/${n.subjectId}`
    if (n.type === 'follow' && n.actorHandle) return `/${locale}/u/${n.actorHandle}`
    return `/${locale}/community`
  })()

  return (
    <li>
      <Link
        href={href}
        className={`group flex items-start gap-3 rounded-xl border border-border bg-bg-elev p-4 transition-colors hover:border-border-strong ${
          !n.read ? 'ring-1 ring-accent/30' : ''
        }`}
      >
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${meta.tone}`}>
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-fg">
            {n.type === 'milestone-post' ? (
              <span className="font-medium">{meta.label}</span>
            ) : (
              <>
                <span className="font-medium">
                  {n.actorName ?? (n.actorHandle ? `@${n.actorHandle}` : 'Someone')}
                </span>{' '}
                {meta.label}
              </>
            )}
          </p>
          {n.snippet && (
            <p className="mt-1 line-clamp-1 text-xs text-fg-muted">"{n.snippet}"</p>
          )}
          <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
            {timeAgo(n.createdAt)}
          </p>
        </div>
        {!n.read && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-accent" />}
      </Link>
    </li>
  )
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-bg-elev p-10 text-center">
      <p className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
        All quiet
      </p>
      <p className="mt-2 text-sm text-fg-muted">
        When someone likes, comments, or follows you, it'll show up here.
      </p>
    </div>
  )
}
