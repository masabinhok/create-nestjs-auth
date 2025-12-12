import { Controller, Get } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { HealthResponse } from '../../common/interfaces/health.interface';

@Controller('health')
export class HealthController {
  @Public()
  @Get()
  check(): HealthResponse {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      services: {
        application: {
          status: 'healthy',
          uptime: process.uptime(),
        },
      },
    };
  }
}
