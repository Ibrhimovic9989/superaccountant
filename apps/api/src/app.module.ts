import { Module } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import { IdentityModule } from './contexts/identity/identity.module'
import { CurriculumModule } from './contexts/curriculum/curriculum.module'
import { AssessmentModule } from './contexts/assessment/assessment.module'
import { LearningModule } from './contexts/learning/learning.module'
import { TutoringModule } from './contexts/tutoring/tutoring.module'
import { CertificationModule } from './contexts/certification/certification.module'
import { NotificationsModule } from './contexts/notifications/notifications.module'

/**
 * Global throttler. Per-IP rate limits applied to every controller.
 * Three buckets:
 *   - short:  10 req / 1 s   — basic burst protection
 *   - medium: 100 req / 1 m  — sustained traffic ceiling
 *   - long:   1000 req / 1 h — daily cap for most users
 *
 * Expensive endpoints (`/tutor/ask`, `/grand-test/start`) override these
 * with tighter per-route limits via @Throttle() in their controllers.
 */
@Module({
  imports: [
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 1_000, limit: 10 },
      { name: 'medium', ttl: 60_000, limit: 100 },
      { name: 'long', ttl: 3_600_000, limit: 1000 },
    ]),
    IdentityModule,
    CurriculumModule,
    AssessmentModule,
    LearningModule,
    TutoringModule,
    CertificationModule,
    NotificationsModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
