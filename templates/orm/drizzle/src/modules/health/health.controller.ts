import { Controller, Get, Inject } from '@nestjs/common';
import { Pool } from 'pg';
import { DRIZZLE } from '../../database/database.module';
import { Public } from '../../common/decorators/public.decorator';

@Controller('health')
export class HealthController {
  constructor(@Inject(DRIZZLE) private db: any) {}

  @Public()
  @Get()
  async check() {
    let dbStatus = 'unhealthy';

    try {
      // Try to execute a simple query
      await this.db.execute('SELECT 1');
      dbStatus = 'healthy';
    } catch (error) {
      dbStatus = 'unhealthy';
    }

    return {
      status: dbStatus === 'healthy' ? 'ok' : 'error',
      timestamp: new Date().toISOString(),
      services: {
        database: {
          status: dbStatus,
          type: 'postgresql',
        },
      },
    };
  }
}
