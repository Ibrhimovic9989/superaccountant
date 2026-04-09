import { Controller, Get, Inject, Param } from '@nestjs/common'
import { CertificationService } from '../application/certification.service'
import { CERTIFICATION_SERVICE } from '../../assessment/interface/grand-test.controller'

@Controller('verify')
export class VerifyController {
  constructor(@Inject(CERTIFICATION_SERVICE) private readonly cert: CertificationService) {}

  /** Public verification endpoint — anyone can call this without auth. */
  @Get(':hash')
  async verify(@Param('hash') hash: string) {
    return await this.cert.verify(hash)
  }
}
