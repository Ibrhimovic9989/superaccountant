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

@Module({
  imports: [CertificationModule],
  controllers: [EntryTestController, DailyAssignmentController, GrandTestController],
  providers: [
    { provide: ENTRY_TEST_SERVICE, useClass: EntryTestService },
    { provide: DAILY_ASSIGNMENT_SERVICE, useClass: DailyAssignmentService },
    { provide: GRAND_TEST_SERVICE, useClass: GrandTestService },
  ],
  exports: [ENTRY_TEST_SERVICE, DAILY_ASSIGNMENT_SERVICE, GRAND_TEST_SERVICE],
})
export class AssessmentModule {}
