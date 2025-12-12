import { Controller, Get } from '@nestjs/common';
import {
  HealthCheckService,
  HealthCheck,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';
import { Public } from 'src/common/decorators/public.decorator';
import { HealthResponse } from 'src/common/interfaces/health.interface';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
  ) {}

  @Get()
  @Public()
  @HealthCheck()
  async check(): Promise<HealthResponse> {
    const result = await this.health.check([
      () => this.db.pingCheck('database'),
    ]);

    const dbStatus: 'healthy' | 'unhealthy' = result.status === 'ok' ? 'healthy' : 'unhealthy';

    return {
      status: result.status as 'ok' | 'error',
      timestamp: new Date().toISOString(),
      services: {
        database: {
          status: dbStatus,
          type: 'relational',
          details: result.details?.database || result.info?.database,
        },
      },
    };
  }
}
