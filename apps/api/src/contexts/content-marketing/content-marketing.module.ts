import { Module } from '@nestjs/common'
import { AutoGenerateService } from './application/auto-generate.service'
import { GetInsightsBriefingService } from './application/get-insights-briefing.service'
import { RefreshInsightsService } from './application/refresh-insights.service'
import { ResearchTopicsService } from './application/research-topics.service'
import { WritePostService } from './application/write-post.service'
import { BlogRepository } from './infrastructure/blog.repository'
import { InsightsRepository } from './infrastructure/insights.repository'
import {
  AUTO_GENERATE_SERVICE,
  BlogCronController,
} from './interface/blog-cron.controller'
import { InsightsCronController } from './interface/insights-cron.controller'

/**
 * Content-marketing bounded context — the autonomous SEO/GEO blog
 * writer agent. Exposes a single HTTP endpoint (POST
 * /blog/auto-generate) for Supabase Cron.
 *
 * Per CLAUDE.md §3.4 DIP: AutoGenerateService is consumed only via the
 * AUTO_GENERATE_SERVICE token so adjacent contexts (admin tools, an
 * eventual "force-publish" UI) can swap implementations under test.
 */
@Module({
  controllers: [BlogCronController, InsightsCronController],
  providers: [
    ResearchTopicsService,
    WritePostService,
    BlogRepository,
    AutoGenerateService,
    InsightsRepository,
    RefreshInsightsService,
    GetInsightsBriefingService,
    { provide: AUTO_GENERATE_SERVICE, useExisting: AutoGenerateService },
  ],
  exports: [AUTO_GENERATE_SERVICE, GetInsightsBriefingService],
})
export class ContentMarketingModule {}
