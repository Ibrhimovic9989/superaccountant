/**
 * Read-side service — the writer agent's window into the insights
 * snapshot. Returns a pre-formatted markdown briefing ready to drop
 * into a prompt.
 *
 * Cached in-process for 5 minutes so a manual "regenerate now"
 * admin click (which fires research → write in quick succession)
 * doesn't re-hit Supabase twice for the same snapshot.
 *
 * Failure mode: if the DB read throws OR the table is empty we return
 * an empty string. The prompt injectors on the write side already
 * treat "" as "no context available, proceed on defaults" — that
 * keeps the daily cron alive when insights are cold.
 */

import { Inject, Injectable } from '@nestjs/common'
import { InsightsRepository } from '../infrastructure/insights.repository'
import { buildInsightsBriefing } from './insights-briefing'

const CACHE_TTL_MS = 5 * 60 * 1000

@Injectable()
export class GetInsightsBriefingService {
  private cached: { at: number; text: string } | null = null

  constructor(@Inject(InsightsRepository) private readonly repo: InsightsRepository) {}

  async execute(): Promise<string> {
    if (this.cached && Date.now() - this.cached.at < CACHE_TTL_MS) {
      return this.cached.text
    }
    let text = ''
    try {
      const snapshot = await this.repo.findLatestSnapshot()
      text = buildInsightsBriefing(snapshot)
    } catch (err) {
      console.warn('[get-insights-briefing] read failed, returning empty', {
        err: (err as Error).message,
      })
      text = ''
    }
    this.cached = { at: Date.now(), text }
    return text
  }
}
