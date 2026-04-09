import { Module } from '@nestjs/common'
import { TutorController } from './interface/tutor.controller'
import { TutoringAgent } from './application/tutor/tutoring.agent'
import { PrismaCurriculumSearch } from './infrastructure/prisma-curriculum-search'
import { PrismaSessionMemory } from './infrastructure/prisma-session-memory'
import { PrismaMastery } from './infrastructure/prisma-mastery'
import { PrismaUserProfile } from './infrastructure/prisma-user-profile'
import {
  CURRICULUM_SEARCH,
  MASTERY,
  SESSION_MEMORY,
  TUTORING_AGENT,
  USER_PROFILE,
} from './tutoring.tokens'

@Module({
  controllers: [TutorController],
  providers: [
    { provide: CURRICULUM_SEARCH, useClass: PrismaCurriculumSearch },
    { provide: SESSION_MEMORY, useClass: PrismaSessionMemory },
    { provide: MASTERY, useClass: PrismaMastery },
    { provide: USER_PROFILE, useClass: PrismaUserProfile },
    {
      provide: TUTORING_AGENT,
      inject: [CURRICULUM_SEARCH, SESSION_MEMORY, MASTERY, USER_PROFILE],
      useFactory: (
        search: PrismaCurriculumSearch,
        memory: PrismaSessionMemory,
        mastery: PrismaMastery,
        profile: PrismaUserProfile,
      ) => new TutoringAgent({ search, memory, mastery, profile }),
    },
  ],
  exports: [TUTORING_AGENT],
})
export class TutoringModule {}
