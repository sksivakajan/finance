import { Controller, Get } from '@nestjs/common';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import type { AccessTokenPayload } from '../../auth/services/token.service.js';
import { ReportingService } from './reporting.service.js';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly reporting: ReportingService) {}

  @Get('summary')
  summary(@CurrentUser() user: AccessTokenPayload) {
    return this.reporting.getDashboardSummary(user.sub);
  }
}
