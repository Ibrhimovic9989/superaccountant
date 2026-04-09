'use client'

import * as React from 'react'
import { useEffect, useState } from 'react'
import { Check, ChevronLeft, ChevronRight, Sparkles, X } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import type { AssessmentItem } from '@/lib/data/lessons'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

type Props = {
  items: AssessmentItem[]
  locale: 'en' | 'ar'
  onAskTutor: (text: string) => void
  /** Called whenever an MCQ submission lands; lets the parent track running totals. */
  onMcqResult?: (correct: number, total: number) => void
}

/**
 * 8-item practice runner. MCQs grade locally against the stored answer (instant
 * feedback). Short-answer / scenario items defer to the tutor — clicking
 * "Get feedback" pushes the question + the student's answer into the drawer.
 */
export function Practice({ items, locale, onAskTutor, onMcqResult }: Props) {
  const [idx, setIdx] = useState(0)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [submitted, setSubmitted] = useState<Record<number, boolean>>({})

  useEffect(() => {
    if (!onMcqResult) return
    let total = 0
    let correct = 0
    items.forEach((it, i) => {
      if (it.type !== 'mcq') return
      if (submitted[i]) {
        total++
        const studentAnswer = answers[i] ?? ''
        if (studentAnswer.trim().toLowerCase() === it.answer.trim().toLowerCase()) correct++
      }
    })
    onMcqResult(correct, total)
  }, [items, submitted, answers, onMcqResult])

  const item = items[idx]
  if (!item) {
    return (
      <p className="text-sm text-fg-muted">
        {locale === 'ar' ? 'لا توجد تمارين' : 'No practice items.'}
      </p>
    )
  }

  const total = items.length
  const isMcq = item.type === 'mcq'
  const wasSubmitted = !!submitted[idx]
  const studentAnswer = answers[idx] ?? ''
  const isCorrect =
    isMcq && wasSubmitted && normalize(studentAnswer) === normalize(item.answer)
  const promptText = locale === 'ar' ? item.prompt.ar : item.prompt.en
  const choices = item.choices?.map((c) => (locale === 'ar' ? c.ar : c.en)) ?? []

  const correctCount = items.reduce((acc, it, i) => {
    if (it.type !== 'mcq' || !submitted[i]) return acc
    return acc + (normalize(answers[i] ?? '') === normalize(it.answer) ? 1 : 0)
  }, 0)
  const submittedCount = Object.keys(submitted).length

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-bg-elev">
      {/* Header strip */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-bg-overlay px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-wider text-fg-muted">
            {locale === 'ar' ? `سؤال` : `Question`}{' '}
            <span className="text-fg tabular-nums">{idx + 1}</span>
            <span className="text-fg-subtle"> / {total}</span>
          </span>
          <Badge variant="default">{item.type.replace('_', ' ')}</Badge>
          <Badge variant="outline">{item.difficulty}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
            {locale === 'ar' ? 'النتيجة' : 'Score'}
          </span>
          <span className="font-mono text-xs tabular-nums text-fg">
            {correctCount}
            <span className="text-fg-subtle">/{submittedCount || '-'}</span>
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="space-y-5 p-4 sm:space-y-6 sm:p-6">
        <p className="text-[15px] leading-relaxed text-fg sm:text-lg">{promptText}</p>

        {isMcq ? (
          <div className="grid gap-2">
            {choices.map((c, i) => {
              const selected = studentAnswer === c
              const isAnswer = wasSubmitted && normalize(c) === normalize(item.answer)
              const isWrongPick = wasSubmitted && selected && !isAnswer
              const letter = String.fromCharCode(65 + i)
              return (
                <label
                  key={i}
                  className={cn(
                    'group flex cursor-pointer items-start gap-3 rounded-lg border px-4 py-3 text-sm transition-all',
                    selected && !wasSubmitted && 'border-accent bg-accent-soft',
                    !selected &&
                      !wasSubmitted &&
                      'border-border hover:border-border-strong hover:bg-bg-overlay',
                    isAnswer && 'border-success bg-success/10',
                    isWrongPick && 'border-danger bg-danger/10',
                    wasSubmitted && !isAnswer && !isWrongPick && 'border-border opacity-50',
                  )}
                >
                  <input
                    type="radio"
                    name={`q${idx}`}
                    value={c}
                    checked={selected}
                    disabled={wasSubmitted}
                    onChange={() => setAnswers({ ...answers, [idx]: c })}
                    className="sr-only"
                  />
                  <span
                    className={cn(
                      'mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded border font-mono text-[10px] font-bold transition-colors',
                      selected && !wasSubmitted && 'border-accent bg-accent text-accent-fg',
                      isAnswer && 'border-success bg-success text-bg',
                      isWrongPick && 'border-danger bg-danger text-bg',
                      !selected &&
                        !wasSubmitted &&
                        'border-border bg-bg-elev text-fg-muted group-hover:border-border-strong',
                    )}
                  >
                    {isAnswer ? <Check className="h-3 w-3" /> : isWrongPick ? <X className="h-3 w-3" /> : letter}
                  </span>
                  <span className="flex-1 leading-relaxed">{c}</span>
                </label>
              )
            })}
          </div>
        ) : (
          <textarea
            rows={5}
            placeholder={locale === 'ar' ? 'اكتب إجابتك…' : 'Type your answer…'}
            value={studentAnswer}
            onChange={(e) => setAnswers({ ...answers, [idx]: e.target.value })}
            disabled={wasSubmitted}
            className="w-full resize-none rounded-lg border border-border bg-bg p-3 text-sm text-fg outline-none transition-colors placeholder:text-fg-subtle focus:border-accent"
          />
        )}

        {/* Feedback */}
        <AnimatePresence>
          {wasSubmitted && isMcq && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={cn(
                'rounded-lg border px-4 py-3 text-sm',
                isCorrect
                  ? 'border-success/30 bg-success/10 text-success'
                  : 'border-danger/30 bg-danger/10 text-danger',
              )}
            >
              <div className="flex items-center gap-2 font-medium">
                {isCorrect ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                {isCorrect
                  ? locale === 'ar'
                    ? 'صحيح!'
                    : 'Correct!'
                  : locale === 'ar'
                    ? `الإجابة الصحيحة: ${item.answer}`
                    : `The correct answer is: ${item.answer}`}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-bg-overlay px-5 py-3">
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setIdx(idx - 1)}
            disabled={idx === 0}
          >
            <ChevronLeft className="h-3.5 w-3.5 rtl:rotate-180" />
            {locale === 'ar' ? 'السابق' : 'Prev'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setIdx(idx + 1)}
            disabled={idx === total - 1}
          >
            {locale === 'ar' ? 'التالي' : 'Next'}
            <ChevronRight className="h-3.5 w-3.5 rtl:rotate-180" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {!wasSubmitted ? (
            isMcq ? (
              <Button
                type="button"
                variant="accent"
                size="sm"
                disabled={!studentAnswer}
                onClick={() => setSubmitted({ ...submitted, [idx]: true })}
              >
                {locale === 'ar' ? 'إرسال' : 'Submit'}
              </Button>
            ) : (
              <Button
                type="button"
                variant="accent"
                size="sm"
                disabled={!studentAnswer.trim()}
                onClick={() => {
                  setSubmitted({ ...submitted, [idx]: true })
                  const ask =
                    locale === 'ar'
                      ? `قيّم إجابتي على هذا السؤال:\n\nالسؤال: ${promptText}\n\nإجابتي: ${studentAnswer}`
                      : `Please grade my answer to this question:\n\nQuestion: ${promptText}\n\nMy answer: ${studentAnswer}`
                  onAskTutor(ask)
                }}
              >
                <Sparkles className="h-3.5 w-3.5" />
                {locale === 'ar' ? 'احصل على تقييم' : 'Get feedback'}
              </Button>
            )
          ) : null}
        </div>
      </div>
    </div>
  )
}

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ')
}
