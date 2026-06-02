/**
 * Email port — what the assessment context needs from "outside" to
 * deliver the progress-card mail. Lives at the application layer per
 * CLAUDE.md §3.3 DIP: domain depends on a port, infrastructure (Resend
 * via @sa/email) implements it, tests pass an in-memory adapter.
 *
 * The port intentionally accepts already-rendered subject/html/text
 * rather than ProgressCardEmailArgs — keeps the contract small and
 * lets the use-case stay responsible for template selection.
 */

export type SendableEmail = {
  to: string
  subject: string
  html: string
  text: string
}

export type EmailPort = {
  send(input: SendableEmail): Promise<void>
}

/** Nest DI token. */
export const EMAIL_PORT = Symbol('EMAIL_PORT')
