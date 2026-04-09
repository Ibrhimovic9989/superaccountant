import { Module } from '@nestjs/common'
import { LearningController, MARK_COMPLETE_SERVICE } from './interface/learning.controller'
import { MarkCompleteService } from './application/mark-complete.service'

@Module({
  controllers: [LearningController],
  providers: [{ provide: MARK_COMPLETE_SERVICE, useClass: MarkCompleteService }],
  exports: [MARK_COMPLETE_SERVICE],
})
export class LearningModule {}
