import { Controller, Get } from '@nestjs/common';
import { Connection } from 'mongoose';
import { InjectConnection } from '@nestjs/mongoose';
import { Public } from '../../common/decorators/public.decorator';
import { HealthResponse } from '../../common/interfaces/health.interface';

@Controller('health')
export class HealthController {
  constructor(@InjectConnection() private connection: Connection) {}

  @Public()
  @Get()
  async check(): Promise<HealthResponse> {
    const dbStatus: 'healthy' | 'unhealthy' = this.connection.readyState === 1 ? 'healthy' : 'unhealthy';

    return {
      status: dbStatus === 'healthy' ? 'ok' : 'error',
      timestamp: new Date().toISOString(),
      services: {
        database: {
          status: dbStatus,
          type: 'mongodb',
          details: { readyState: this.connection.readyState },
        },
      },
    };
  }
}
