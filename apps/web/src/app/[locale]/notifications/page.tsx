import { AtSign, Award, Heart, MessageSquare, UserPlus } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { CommunityNav } from '@/components/community/community-nav'
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
  like: { icon: Heart, label: 'liked your post', tone: 'bg-coral text-white' },
  comment: { icon: MessageSquare, label: 'commented on your post', tone: 'bg-brand text-white' },
  follow: { icon: UserPlus, label: 'started following you', tone: 'bg-mint text-white' },
  'milestone-post': { icon: Award, label: 'Your achievement went live', tone: 'bg-sky text-ink' },
  mention: { icon: AtSign, label: 'mentioned you', tone: 'bg-grape text-white' },
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
    <div className="relative min-h-screen bg-cream text-ink">
      <CommunityNav locale={locale} />

      <main className="relative mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-10">
        <header className="mb-8">
          <span className="mb-2 inline-block font-mono text-xs font-bold uppercase tracking-[0.18em] text-coral">
            📬 Inbox
          </span>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
            Notifications
          </h1>
        </header>

        {notifications.length === 0 ? (
          <EmptyState />
        ) : (
          <ul className="space-y-3">
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
        className={`group flex items-start gap-3 rounded-2xl border-2 border-ink bg-white p-4 shadow-pop-xs transition-transform hover:-translate-y-0.5 hover:shadow-pop-sm ${
          !n.read ? 'ring-4 ring-brand/25' : ''
        }`}
      >
        <span
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border-2 border-ink ${meta.tone}`}
        >
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] leading-snug text-ink">
            {n.type === 'milestone-post' ? (
              <span className="font-display font-extrabold">{meta.label}</span>
            ) : (
              <>
                <span className="font-display font-extrabold">
                  {n.actorName ?? (n.actorHandle ? `@${n.actorHandle}` : 'Someone')}
                </span>{' '}
                <span className="font-medium">{meta.label}</span>
              </>
            )}
          </p>
          {n.snippet && (
            <p className="mt-1 line-clamp-1 text-xs italic text-ink/60">&ldquo;{n.snippet}&rdquo;</p>
          )}
          <p className="mt-1 font-mono text-[10px] font-bold uppercase tracking-wider text-ink/50">
            {timeAgo(n.createdAt)}
          </p>
        </div>
        {!n.read && (
          <span className="mt-2 h-3 w-3 shrink-0 rounded-full border-2 border-ink bg-brand" />
        )}
      </Link>
    </li>
  )
}

function EmptyState() {
  return (
    <div className="rounded-3xl border-2 border-dashed border-ink bg-white p-10 text-center shadow-pop-xs">
      <p className="text-3xl">🌙</p>
      <p className="mt-3 font-mono text-[10px] font-bold uppercase tracking-wider text-ink/60">
        All quiet
      </p>
      <p className="mt-2 font-display text-lg font-extrabold text-ink">
        Nothing to catch up on.
      </p>
      <p className="mt-1 text-sm font-medium text-ink/60">
        When someone likes, comments, or follows you, it&apos;ll show up here.
      </p>
    </div>
  )
}
