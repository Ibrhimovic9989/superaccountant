import { Module } from '@nestjs/common'
import { LoyaltyService } from './application/loyalty.service'
import { LOYALTY_SERVICE, LoyaltyController } from './interface/loyalty.controller'

/**
 * Loyalty (SA Points) bounded context. Other contexts depend on this
 * via the LOYALTY_SERVICE token — never by importing the concrete
 * LoyaltyService class directly (CLAUDE.md §3.4 DIP).
 *
 * Exposed surface: LOYALTY_SERVICE. The LoyaltyController is only
 * mounted here.
 */
@Module({
  controllers: [LoyaltyController],
  providers: [{ provide: LOYALTY_SERVICE, useClass: LoyaltyService }],
  exports: [LOYALTY_SERVICE],
})
export class LoyaltyModule {}
