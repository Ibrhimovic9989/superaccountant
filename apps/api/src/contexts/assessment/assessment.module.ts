import { Module } from '@nestjs/common'
import { ENTRY_TEST_SERVICE, EntryTestController } from './interface/entry-test.controller'
import { EntryTestService } from './application/entry-test/entry-test.service'
import {
  DAILY_ASSIGNMENT_SERVICE,
  DailyAssignmentController,
} from './interface/daily-assignment.controller'
import { DailyAssignmentService } from './application/daily-assignment.service'
import { GRAND_TEST_SERVICE, GrandTestController } from './interface/grand-test.controller'
import { GrandTestService } from './application/grand-test.service'
import { CertificationModule } from '../certification/certification.module'
import { LoyaltyModule } from '../loyalty/loyalty.module'
import { EMAIL_PORT } from './application/email-port'
import { SEND_PROGRESS_CARD, SendProgressCardEmail } from './application/send-progress-card'
import { ResendEmailAdapter } from './infrastructure/resend-email.adapter'

@Module({
  imports: [CertificationModule, LoyaltyModule],
  controllers: [EntryTestController, DailyAssignmentController, GrandTestController],
  providers: [
    { provide: ENTRY_TEST_SERVICE, useClass: EntryTestService },
    { provide: DAILY_ASSIGNMENT_SERVICE, useClass: DailyAssignmentService },
    { provide: GRAND_TEST_SERVICE, useClass: GrandTestService },
    // Email port wired to the Resend-backed @sa/email adapter.
    { provide: EMAIL_PORT, useClass: ResendEmailAdapter },
    { provide: SEND_PROGRESS_CARD, useClass: SendProgressCardEmail },
  ],
  exports: [ENTRY_TEST_SERVICE, DAILY_ASSIGNMENT_SERVICE, GRAND_TEST_SERVICE],
})
export class AssessmentModule {}
