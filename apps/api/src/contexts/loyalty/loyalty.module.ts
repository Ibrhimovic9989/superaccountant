import { Module } from '@nestjs/common'
import { LoyaltyService } from './application/loyalty.service'
import { PayoutService } from './application/payout.service'
import { LOYALTY_SERVICE, LoyaltyController } from './interface/loyalty.controller'

/**
 * Loyalty (SA Points) bounded context. Other contexts depend on this
 * via the LOYALTY_SERVICE token — never by importing the concrete
 * LoyaltyService class directly (CLAUDE.md §3.4 DIP).
 *
 * Exposed surface: LOYALTY_SERVICE + PayoutService. The
 * LoyaltyController is only mounted here.
 */
@Module({
  controllers: [LoyaltyController],
  providers: [
    LoyaltyService,
    { provide: LOYALTY_SERVICE, useExisting: LoyaltyService },
    PayoutService,
  ],
  exports: [LOYALTY_SERVICE, PayoutService],
})
export class LoyaltyModule {}
