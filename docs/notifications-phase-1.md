# Notifications — Phase 1

Engagement spine for the SuperAccountant habit-loop. The scheduler and
channel-adapter registry are wired end-to-end. Two channels work
today; two are stubbed with precise wiring instructions in source.

## What's wired (works end-to-end today)

- **In-app inbox** — `InAppChannelAdapter` writes to `NotificationInbox`.
  The Phase 2 bell-dropdown component in `apps/web` reads those rows.
- **Email** — `EmailChannelAdapter` renders the bilingual
  `generic-notification` template and sends via `@sa/email` (Resend).
- **Scheduler** — `DispatchDueNotifications` picks up to 200 pending
  `ScheduledNotification` rows whose `scheduledAt <= now`, consults
  `NotificationPreference`, and dispatches via the channel registry.
  Idempotent (status CAS on pending).
- **Trigger API** — `NotificationsService` is exported from the
  notifications module. Other contexts inject `NOTIFICATIONS_SERVICE`
  and call `scheduleClassReminder`, `scheduleDailyNudge`,
  `scheduleStreakAtRiskWarning`, `scheduleWeeklyProgress`, or the
  generic `schedule`.
- **Preferences API** — `POST /notifications/preferences/get` and
  `…/update` are live. The frontend settings UI ships next session.

## What's stubbed (drop-in replacement when ready)

- **Push** — `PushChannelAdapter` logs a warning and returns
  `{status: 'stubbed'}`. The comment block at the top of
  `apps/api/src/contexts/notifications/infrastructure/channels/push.adapter.ts`
  lists the exact steps to wire FCM.
- **WhatsApp** — `WhatsAppChannelAdapter`, same shape. See the comment
  in `whatsapp.adapter.ts` for the Gupshup / Meta Cloud API steps.

A stubbed adapter still counts as work-done for the scheduler — the
row transitions to `status='sent'` and `NotificationDelivery.status =
'stubbed'`. That prevents the same row from re-firing every cron tick
while still letting us count stubbed deliveries in monitoring.

## Tables (raw SQL, applied via `packages/db/scripts/add-notifications-tables.mjs`)

| Table | Purpose |
|---|---|
| `NotificationPreference` | Per-user (channel × category) opt-in matrix |
| `ScheduledNotification` | The queue; status `pending → sent / failed / skipped_opt_out / cancelled` |
| `NotificationDelivery` | Append-only audit log of every dispatch attempt |
| `NotificationInbox` | What the in-app bell-dropdown renders |

Run:
```sh
cd packages/db && node scripts/add-notifications-tables.mjs
```

## ENV vars Ibrahim needs when accounts are ready

Already set (no change required):
- `CRON_SECRET` (or fallback `NEXTAUTH_SECRET`) — guards
  `POST /notifications/dispatch-due`.
- `RESEND_API_KEY`, `EMAIL_FROM` — used by the email adapter.

To wire **FCM** (push):
- `FCM_PROJECT_ID` — Firebase project id.
- `FCM_SERVICE_ACCOUNT_JSON` — base64-encoded service account JSON.
- (new table) `UserPushToken` — per-user FCM tokens collected on login.

To wire **WhatsApp**:
- `WHATSAPP_PROVIDER` — e.g. `gupshup` or `meta_cloud`.
- `WHATSAPP_API_KEY` — API key from the provider.
- `WHATSAPP_FROM_NUMBER_ID` — verified WABA number id.

## Supabase cron

Add a scheduled function calling the dispatcher every minute (or as
often as desired):

```sql
SELECT cron.schedule(
  'notifications-dispatch-due',
  '* * * * *',
  $$
    SELECT net.http_post(
      url := 'https://api.superaccountant.app/notifications/dispatch-due',
      headers := jsonb_build_object('X-Cron-Secret', current_setting('app.cron_secret'))
    );
  $$
);
```

## Sample curl

Dispatcher (cron-style):

```sh
curl -X POST https://api.superaccountant.app/notifications/dispatch-due \
  -H "X-Cron-Secret: $CRON_SECRET"
# → {"processed":7,"delivered":3,"stubbed":2,"failed":0,"skippedOptOut":2}
```

Get preferences for a user:

```sh
curl -X POST https://api.superaccountant.app/notifications/preferences/get \
  -H "Content-Type: application/json" \
  -d '{"userId":"u_abc123"}'
```

Update one preference:

```sh
curl -X POST https://api.superaccountant.app/notifications/preferences/update \
  -H "Content-Type: application/json" \
  -d '{
    "userId":"u_abc123",
    "channel":"email",
    "category":"daily_nudge",
    "optedIn":false
  }'
```

## Decisions made for Phase 1

- **Default is opted-in.** Absence of a `NotificationPreference` row =
  delivery proceeds. Rows are materialised only when a user opts out.
  Keeps onboarding clean; respects "do as little as possible until
  the user makes a choice" UX.
- **Stubbed deliveries clear the queue.** A push or whatsapp row
  becomes `status='sent'` even though no real push fired. Rationale:
  re-firing every cron tick until the real adapter ships would create
  noise the moment Ibrahim wires FCM (every queued stubbed row would
  suddenly start delivering for real). The `NotificationDelivery`
  audit row carries `status='stubbed'` so monitoring can tell the
  difference.
- **Class reminders, daily nudges fan out to in_app + email + push.**
  WhatsApp is not included by default because it requires
  pre-approved templates. Callers can pass the `whatsapp` channel
  explicitly via `schedule()` if they want to.
- **Weekly progress is email + in_app only.** Push notifications for
  a weekly digest feel spammy; not included by default.
- **The dispatcher batch size is 200.** Chosen as a safe upper bound
  for a 1-minute cron tick. Adjust if backlogs build up.

## Out of scope (next session)

- Frontend `/settings/notifications` page rendering the toggle grid.
- Top-bar bell-dropdown component reading `NotificationInbox`.
- Real FCM project setup.
- Real WhatsApp Business API verification.
