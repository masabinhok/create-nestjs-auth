import { Controller, Get } from '@nestjs/common';
import {
  HealthCheckService,
  HealthCheck,
  PrismaHealthIndicator,
} from '@nestjs/terminus';
import { PrismaService } from 'src/prisma/prisma.service';
import { Public } from 'src/common/decorators/public.decorator';
import { HealthResponse } from 'src/common/interfaces/health.interface';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private prismaHealth: PrismaHealthIndicator,
    private prisma: PrismaService,
  ) {}

  @Get()
  @Public()
  @HealthCheck()
  async check(): Promise<HealthResponse> {
    const result = await this.health.check([
      () => this.prismaHealth.pingCheck('database', this.prisma),
    ]);

    const dbStatus: 'healthy' | 'unhealthy' = result.status === 'ok' ? 'healthy' : 'unhealthy';

    return {
      status: result.status as 'ok' | 'error',
      timestamp: new Date().toISOString(),
      services: {
        database: {
          status: dbStatus,
          type: 'postgresql',
          details: result.details?.database || result.info?.database,
        },
      },
    };
  }
}
