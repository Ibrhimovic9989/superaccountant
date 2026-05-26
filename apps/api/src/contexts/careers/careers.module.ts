import { Module } from '@nestjs/common'
import { ApplicationsService } from './application/applications.service'
import { CompaniesService } from './application/companies.service'
import { JobsService } from './application/jobs.service'
import {
  APPLICATIONS_SERVICE,
  ApplicationsController,
} from './interface/applications.controller'
import { COMPANIES_SERVICE, CompaniesController } from './interface/companies.controller'
import { JOBS_SERVICE, JobsController } from './interface/jobs.controller'

/**
 * Careers bounded context — companies + jobs + applications.
 * Internally JobsService depends on CompaniesService via forwardRef
 * for the post-job approval check. Both are provided through tokens
 * so other modules can DI-inject them if needed.
 */
@Module({
  controllers: [CompaniesController, JobsController, ApplicationsController],
  providers: [
    { provide: COMPANIES_SERVICE, useClass: CompaniesService },
    // Concrete class also registered so JobsService can inject by class
    // via forwardRef. Both bindings point to the same singleton.
    CompaniesService,
    { provide: JOBS_SERVICE, useClass: JobsService },
    { provide: APPLICATIONS_SERVICE, useClass: ApplicationsService },
  ],
  exports: [COMPANIES_SERVICE, JOBS_SERVICE, APPLICATIONS_SERVICE],
})
export class CareersModule {}
