import { Controller, Get } from '@nestjs/common';
import { Connection } from 'mongoose';
import { InjectConnection } from '@nestjs/mongoose';
import { Public } from '../../common/decorators/public.decorator';

@Controller('health')
export class HealthController {
  constructor(@InjectConnection() private connection: Connection) {}

  @Public()
  @Get()
  async check() {
    const dbStatus = this.connection.readyState === 1 ? 'healthy' : 'unhealthy';

    return {
      status: dbStatus === 'healthy' ? 'ok' : 'error',
      timestamp: new Date().toISOString(),
      services: {
        database: {
          status: dbStatus,
          type: 'mongodb',
        },
      },
    };
  }
}
