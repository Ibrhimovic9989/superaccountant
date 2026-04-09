import { Module } from '@nestjs/common'
import { CertificationService } from './application/certification.service'
import { VerifyController } from './interface/verify.controller'
import { CERTIFICATION_SERVICE } from '../assessment/interface/grand-test.controller'

@Module({
  controllers: [VerifyController],
  providers: [{ provide: CERTIFICATION_SERVICE, useClass: CertificationService }],
  exports: [CERTIFICATION_SERVICE],
})
export class CertificationModule {}
