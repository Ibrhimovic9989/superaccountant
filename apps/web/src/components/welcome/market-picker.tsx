'use client'

import { useState } from 'react'
import { ArrowRight, Check } from 'lucide-react'
import { motion } from 'motion/react'
import { Button } from '@/components/ui/button'
import { MagicCard } from '@/components/magicui/magic-card'
import { BorderBeam } from '@/components/magicui/border-beam'
import { NumberTicker } from '@/components/magicui/number-ticker'
import { cn } from '@/lib/utils'
import type { PoolCounts } from '@/lib/data/welcome'

type Market = 'india' | 'ksa'

const COPY = {
  en: {
    indiaName: 'India',
    indiaTrack: 'Chartered Path',
    indiaTags: ['Companies Act', 'GST', 'Income Tax', 'TDS', 'Tally Prime'],
    ksaName: 'Saudi Arabia',
    ksaTrack: "Mu'tamad Path",
    ksaTags: ['ZATCA', 'VAT', 'Zakat', 'Fatoora', 'IFRS · SOCPA'],
    questions: 'questions in your placement test',
    cta: 'Start placement test',
    selected: 'Selected',
  },
  ar: {
    indiaName: 'الهند',
    indiaTrack: 'المسار المعتمد',
    indiaTags: ['قانون الشركات', 'GST', 'ضريبة الدخل', 'TDS', 'تالي'],
    ksaName: 'المملكة العربية السعودية',
    ksaTrack: 'مسار مُعتمَد',
    ksaTags: ['ZATCA', 'ضريبة القيمة المضافة', 'الزكاة', 'فاتورة', 'IFRS · SOCPA'],
    questions: 'سؤال في اختبار التحديد',
    cta: 'ابدأ اختبار التحديد',
    selected: 'محدد',
  },
} as const

type Props = {
  locale: 'en' | 'ar'
  pool: PoolCounts
  action: (formData: FormData) => void
}

export function MarketPicker({ locale, pool, action }: Props) {
  const [selected, setSelected] = useState<Market>('india')
  const t = COPY[locale]

  const cards: Array<{
    market: Market
    flag: string
    name: string
    track: string
    tags: readonly string[]
    count: number
  }> = [
    {
      market: 'india',
      flag: '🇮🇳',
      name: t.indiaName,
      track: t.indiaTrack,
      tags: t.indiaTags,
      count: pool.india[locale],
    },
    {
      market: 'ksa',
      flag: '🇸🇦',
      name: t.ksaName,
      track: t.ksaTrack,
      tags: t.ksaTags,
      count: pool.ksa[locale],
    },
  ]

  return (
    <form action={action} className="mt-10 space-y-8">
      <div className="grid gap-4 sm:grid-cols-2">
        {cards.map((card) => {
          const isSelected = selected === card.market
          return (
            <button
              key={card.market}
              type="button"
              onClick={() => setSelected(card.market)}
              className={cn(
                'relative isolate overflow-hidden rounded-2xl text-start transition-all',
                isSelected ? 'scale-[1.01]' : 'opacity-80 hover:opacity-100',
              )}
            >
              <input
                type="radio"
                name="market"
                value={card.market}
                checked={isSelected}
                readOnly
                className="sr-only"
              />
              <MagicCard
                className={cn(
                  'h-full rounded-2xl border',
                  isSelected ? 'border-accent' : 'border-border',
                )}
              >
                <div className="relative flex h-full flex-col gap-5 p-6">
                  <div className="flex items-start justify-between">
                    <span className="text-4xl leading-none" aria-hidden>
                      {card.flag}
                    </span>
                    {isSelected && (
                      <motion.span
                        layoutId="market-selected"
                        className="inline-flex items-center gap-1 rounded-full border border-accent/30 bg-accent-soft px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-accent"
                      >
                        <Check className="h-3 w-3" />
                        {t.selected}
                      </motion.span>
                    )}
                  </div>

                  <div>
                    <h3 className="text-2xl font-semibold tracking-tight">{card.name}</h3>
                    <p className="font-mono text-[11px] uppercase tracking-wider text-fg-subtle">
                      {card.track}
                    </p>
                  </div>

                  <ul className="flex flex-wrap gap-1.5">
                    {card.tags.map((tag) => (
                      <li
                        key={tag}
                        className="inline-flex items-center rounded-md border border-border bg-bg px-2 py-0.5 text-xs text-fg-muted"
                      >
                        {tag}
                      </li>
                    ))}
                  </ul>

                  <div className="mt-auto border-t border-border pt-4">
                    <div className="flex items-baseline gap-1.5">
                      <NumberTicker
                        value={card.count}
                        className="font-mono text-2xl font-medium tracking-tight"
                      />
                      <span className="text-xs text-fg-muted">{t.questions}</span>
                    </div>
                  </div>

                  {isSelected && (
                    <BorderBeam size={60} duration={6} colorFrom="#a78bfa" colorTo="#8b5cf6" />
                  )}
                </div>
              </MagicCard>
            </button>
          )
        })}
      </div>

      <div className="flex justify-end">
        <Button type="submit" variant="accent" size="lg">
          {t.cta}
          <ArrowRight className="h-4 w-4 rtl:rotate-180" />
        </Button>
      </div>
    </form>
  )
}
