'use client'

import * as React from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowUp, MessageSquare, Sparkles, Wrench, X } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { PUBLIC_CONFIG } from '@/lib/config/public'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { PulseDots } from '@/components/ui/loading'
import { track } from '@/lib/analytics'
import { captureException } from '@/lib/observability'

export type TutorDrawerHandle = {
  open: () => void
  ask: (text: string) => void
}

type Msg =
  | { id: number; role: 'user'; text: string }
  | { id: number; role: 'assistant'; text: string; events: ToolEvent[]; done: boolean }

type ToolEvent =
  | { kind: 'call'; tool: string; input: unknown }
  | { kind: 'result'; tool: string; ok: boolean; summary: string }

export type TutorContext = {
  sessionId: string
  userId: string
  market: 'india' | 'ksa'
  locale: 'en' | 'ar'
  currentLessonSlug?: string
  goal?: string
}

type Props = {
  context: TutorContext
  defaultOpen?: boolean
  onRegister?: (handle: TutorDrawerHandle) => void
}

/**
 * Slide-in tutor drawer. Streams from POST /tutor/ask via SSE-style fetch.
 * Renders text deltas live + collapsible tool-call pills above each turn.
 */
export function TutorDrawer({ context, defaultOpen = true, onRegister }: Props) {
  const [open, setOpen] = useState(defaultOpen)
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const idRef = useRef(0)
  const scrollerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || streaming) return
      const userId = ++idRef.current
      const assistantId = ++idRef.current
      setMessages((m) => [
        ...m,
        { id: userId, role: 'user', text },
        { id: assistantId, role: 'assistant', text: '', events: [], done: false },
      ])
      setInput('')
      setStreaming(true)
      setOpen(true)
      track('tutor_message_sent', {
        market: context.market,
        locale: context.locale,
        lessonSlug: context.currentLessonSlug ?? null,
        length: text.length,
      })

      try {
        const res = await fetch(`${PUBLIC_CONFIG.apiUrl}/tutor/ask`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            sessionId: context.sessionId,
            userId: context.userId,
            market: context.market,
            locale: context.locale,
            currentLessonSlug: context.currentLessonSlug,
            goal: context.goal,
            message: text,
          }),
        })
        if (!res.ok || !res.body) throw new Error(`api ${res.status}`)
        await consumeSse(res.body, (event) => {
          setMessages((m) =>
            m.map((msg) => {
              if (msg.id !== assistantId || msg.role !== 'assistant') return msg
              if (event.type === 'text_delta') return { ...msg, text: msg.text + event.text }
              if (event.type === 'tool_call')
                return {
                  ...msg,
                  events: [...msg.events, { kind: 'call', tool: event.tool, input: event.input }],
                }
              if (event.type === 'tool_result')
                return {
                  ...msg,
                  events: [
                    ...msg.events,
                    {
                      kind: 'result',
                      tool: event.tool,
                      ok: event.result?.ok ?? false,
                      summary: summariseResult(event.tool, event.result),
                    },
                  ],
                }
              if (event.type === 'done' || event.type === 'error') return { ...msg, done: true }
              return msg
            }),
          )
        })
      } catch (err) {
        captureException(err, {
          scope: 'tutor-drawer.sendMessage',
          tags: { sessionId: context.sessionId },
        })
        setMessages((m) =>
          m.map((msg) =>
            msg.id === assistantId && msg.role === 'assistant'
              ? {
                  ...msg,
                  text: msg.text + `\n\n_error: ${(err as Error).message}_`,
                  done: true,
                }
              : msg,
          ),
        )
      } finally {
        setStreaming(false)
      }
    },
    [context, streaming],
  )

  useEffect(() => {
    onRegister?.({
      open: () => {
        setOpen(true)
        setTimeout(() => inputRef.current?.focus(), 200)
      },
      ask: (text: string) => {
        setInput(text)
        sendMessage(text)
      },
    })
  }, [onRegister, sendMessage])

  // Cmd/Ctrl + K toggle
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((o) => !o)
        if (!open) setTimeout(() => inputRef.current?.focus(), 200)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  useEffect(() => {
    scrollerRef.current?.scrollTo({
      top: scrollerRef.current.scrollHeight,
      behavior: 'smooth',
    })
  }, [messages, streaming])

  const placeholder =
    context.locale === 'ar' ? 'اسأل عن أي شيء في هذا الدرس…' : 'Ask anything about this lesson…'

  return (
    <>
      {/* FAB when closed */}
      <AnimatePresence>
        {!open && (
          <motion.button
            type="button"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => {
              setOpen(true)
              setTimeout(() => inputRef.current?.focus(), 200)
            }}
            className="fixed end-6 bottom-6 z-50 inline-flex h-12 items-center gap-2 rounded-full border border-border bg-bg-elev px-4 text-sm font-medium text-fg shadow-lg shadow-black/20 transition-colors hover:bg-bg-overlay"
            aria-label="Open tutor"
          >
            <Sparkles className="h-4 w-4 text-accent" />
            {context.locale === 'ar' ? 'اسأل المدرس' : 'Ask the tutor'}
            <kbd className="ms-1 hidden rounded border border-border bg-bg px-1.5 py-0.5 font-mono text-[10px] text-fg-muted sm:inline-block">
              ⌘K
            </kbd>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Drawer */}
      <AnimatePresence>
        {open && (
          <motion.aside
            initial={{ x: context.locale === 'ar' ? '-100%' : '100%' }}
            animate={{ x: 0 }}
            exit={{ x: context.locale === 'ar' ? '-100%' : '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 280 }}
            className="fixed inset-y-0 end-0 z-40 flex w-full flex-col border-s border-border bg-bg-elev shadow-2xl shadow-black/30 sm:w-[420px]"
          >
            {/* Header */}
            <header className="flex h-14 items-center justify-between border-b border-border px-5">
              <div className="flex items-center gap-2.5">
                <span className="relative inline-flex h-7 w-7 items-center justify-center rounded-md bg-accent text-accent-fg">
                  <Sparkles className="h-3.5 w-3.5" />
                </span>
                <div className="leading-tight">
                  <p className="text-sm font-semibold">SuperAccountant</p>
                  <p className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
                    {context.locale === 'ar' ? 'المدرس الذكي' : 'AI Tutor'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close tutor"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-bg-overlay hover:text-fg"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            {/* Scroll area */}
            <div ref={scrollerRef} className="flex-1 space-y-5 overflow-y-auto px-5 py-6">
              {messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-bg">
                    <MessageSquare className="h-5 w-5 text-fg-muted" />
                  </div>
                  <p className="text-sm font-medium text-fg">
                    {context.locale === 'ar'
                      ? 'أنا أقرأ هذا الدرس معك'
                      : "I'm reading this lesson with you"}
                  </p>
                  <p className="mt-1 max-w-xs text-xs text-fg-muted">
                    {context.locale === 'ar'
                      ? 'اسألني عن أي مفهوم، أو اطلب مثالاً، أو اطلب اختبار إتقانك.'
                      : 'Ask about any concept, request an example, or quiz yourself.'}
                  </p>
                </div>
              ) : (
                messages.map((m) => (
                  <div key={m.id}>
                    {m.role === 'user' ? (
                      <div className="flex justify-end">
                        <div className="max-w-[85%] rounded-2xl rounded-tr-md bg-accent px-4 py-2.5 text-sm leading-relaxed text-accent-fg">
                          {m.text}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {m.events.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {m.events
                              .filter((e) => e.kind === 'call' || (e.kind === 'result' && !e.ok))
                              .map((e, i) => (
                                <span
                                  key={i}
                                  className={cn(
                                    'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-mono text-[10px]',
                                    e.kind === 'result' && !e.ok
                                      ? 'border-danger/30 bg-danger/10 text-danger'
                                      : 'border-border bg-bg-overlay text-fg-muted',
                                  )}
                                >
                                  <Wrench className="h-2.5 w-2.5" />
                                  {e.tool}
                                </span>
                              ))}
                          </div>
                        )}
                        {m.text ? (
                          <div className="md-bubble">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.text}</ReactMarkdown>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-fg-subtle">
                            <PulseDots />
                            <span className="text-xs">
                              {m.events.length > 0
                                ? context.locale === 'ar'
                                  ? `يستخدم ${m.events[m.events.length - 1]?.tool ?? ''}…`
                                  : `Using ${m.events[m.events.length - 1]?.tool ?? ''}…`
                                : context.locale === 'ar'
                                  ? 'يفكّر…'
                                  : 'Thinking…'}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Composer */}
            <form
              className="border-t border-border bg-bg-elev p-3"
              onSubmit={(e) => {
                e.preventDefault()
                sendMessage(input)
              }}
            >
              <div className="relative flex items-end gap-2 rounded-xl border border-border bg-bg p-2 focus-within:border-accent focus-within:bg-bg-overlay">
                <textarea
                  ref={inputRef}
                  rows={1}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      sendMessage(input)
                    }
                  }}
                  placeholder={placeholder}
                  disabled={streaming}
                  className="flex-1 resize-none bg-transparent px-2 py-1.5 text-sm text-fg outline-none placeholder:text-fg-subtle"
                  style={{ maxHeight: 160 }}
                />
                <Button
                  type="submit"
                  variant="accent"
                  size="icon"
                  disabled={streaming || !input.trim()}
                  className="shrink-0 rounded-lg"
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
              </div>
              <p className="mt-2 px-1 text-[10px] text-fg-subtle">
                <kbd className="rounded border border-border bg-bg-overlay px-1.5 py-0.5 font-mono">
                  ⌘K
                </kbd>{' '}
                {context.locale === 'ar' ? 'لتبديل' : 'to toggle'} ·{' '}
                <kbd className="rounded border border-border bg-bg-overlay px-1.5 py-0.5 font-mono">
                  ↵
                </kbd>{' '}
                {context.locale === 'ar' ? 'للإرسال' : 'to send'}
              </p>
            </form>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  )
}

// ─── SSE consumption ────────────────────────────────────────────────────────

type AgentEvent =
  | { type: 'text_delta'; text: string }
  | { type: 'tool_call'; tool: string; input: unknown }
  | { type: 'tool_result'; tool: string; result: { ok: boolean; output?: unknown; error?: string } }
  | { type: 'usage'; tokensIn: number; tokensOut: number }
  | { type: 'done'; reason: string }
  | { type: 'error'; error: string }
  | { type: 'progress'; tool: string; message: string }

async function consumeSse(
  body: ReadableStream<Uint8Array>,
  onEvent: (e: AgentEvent) => void,
): Promise<void> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buf = ''
  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buf += decoder.decode(value, { stream: true })
    let sep = buf.indexOf('\n\n')
    while (sep !== -1) {
      const block = buf.slice(0, sep)
      buf = buf.slice(sep + 2)
      for (const line of block.split('\n')) {
        if (line.startsWith('data: ')) {
          try {
            onEvent(JSON.parse(line.slice(6)))
          } catch {}
        }
      }
      sep = buf.indexOf('\n\n')
    }
  }
}

function summariseResult(tool: string, result: unknown): string {
  if (!result || typeof result !== 'object') return ''
  // biome-ignore lint/suspicious/noExplicitAny: dynamic shape
  const r = result as any
  if (r.ok === false) return r.error ?? 'failed'
  if (tool === 'search_curriculum' && r.output?.hits) return `${r.output.hits.length} hits`
  if (tool === 'assess_answer' && r.output?.verdict) return r.output.verdict
  if (tool === 'recommend_next_lesson' && r.output?.candidates)
    return `${r.output.candidates.length} candidates`
  return 'ok'
}
