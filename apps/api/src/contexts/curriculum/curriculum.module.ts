import { Module } from '@nestjs/common'
import { CurriculumSearchController } from './interface/search.controller'
import { SpeechController } from './interface/speech.controller'

@Module({
  controllers: [CurriculumSearchController, SpeechController],
})
export class CurriculumModule {}
