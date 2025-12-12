import { Controller, Get, Inject } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DRIZZLE } from '../../database/database.module';
import { DrizzleDB } from '../../database/drizzle';
import { Public } from '../../common/decorators/public.decorator';

@Controller('health')
export class HealthController {
  constructor(@Inject(DRIZZLE) private db: DrizzleDB) {}

  @Public()
  @Get()
  async check() {
    let dbStatus = 'unhealthy';

    try {
      // Try to execute a simple query
      // Simple liveness query against PostgreSQL
      await this.db.execute(sql`select 1`);
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
