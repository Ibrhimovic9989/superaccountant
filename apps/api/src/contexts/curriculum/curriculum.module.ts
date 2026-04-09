import { Module } from '@nestjs/common'
import { CurriculumSearchController } from './interface/search.controller'

@Module({
  controllers: [CurriculumSearchController],
})
export class CurriculumModule {}
