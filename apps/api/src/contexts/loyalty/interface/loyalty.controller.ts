/**
 * Loyalty (SA Points) REST controller — surfaces the wallet to the web
 * app. Three endpoints:
 *
 *   POST /loyalty/balance              → current available + lifetime totals
 *   POST /loyalty/history              → recent ledger entries (default 50)
 *   POST /loyalty/plan-redemption      → preview a checkout debit (read-only)
 *
 * No /commit-redemption endpoint here — that's only ever called from
 * the Razorpay webhook handler inside the cohort flow, which imports
 * LoyaltyService directly via DI. Exposing it over HTTP would let
 * anyone spend their own points without paying.
 */

import { BadRequestException, Body, Controller, Inject, Post } from '@nestjs/common'
import { z } from 'zod'
import { LoyaltyService } from '../application/loyalty.service'

export const LOYALTY_SERVICE = Symbol('LOYALTY_SERVICE')

const UserIdBody = z.object({
  userId: z.string().min(1),
})

const HistoryBody = UserIdBody.extend({
  limit: z.number().int().min(1).max(200).optional(),
})

const PlanRedemptionBody = UserIdBody.extend({
  requestedPoints: z.number().int().min(0),
  orderTotalMinor: z.number().int().min(0),
  currency: z.enum(['INR', 'SAR']),
})

@Controller('loyalty')
export class LoyaltyController {
  constructor(@Inject(LOYALTY_SERVICE) private readonly service: LoyaltyService) {}

  @Post('balance')
  async balance(@Body() body: unknown) {
    try {
      const { userId } = UserIdBody.parse(body)
      return await this.service.getBalance(userId)
    } catch (err) {
      throw new BadRequestException((err as Error).message)
    }
  }

  @Post('history')
  async history(@Body() body: unknown) {
    try {
      const { userId, limit } = HistoryBody.parse(body)
      return { entries: await this.service.getHistory(userId, limit) }
    } catch (err) {
      throw new BadRequestException((err as Error).message)
    }
  }

  @Post('plan-redemption')
  async planRedemption(@Body() body: unknown) {
    try {
      const parsed = PlanRedemptionBody.parse(body)
      return await this.service.planRedemption(parsed)
    } catch (err) {
      throw new BadRequestException((err as Error).message)
    }
  }
}
