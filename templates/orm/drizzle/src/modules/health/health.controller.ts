import { Controller, Get, Inject } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DRIZZLE } from '../../database/database.module';
import { DrizzleDB } from '../../database/drizzle';
import { Public } from '../../common/decorators/public.decorator';
import { HealthResponse } from '../../common/interfaces/health.interface';

@Controller('health')
export class HealthController {
  constructor(@Inject(DRIZZLE) private db: DrizzleDB) {}

  @Public()
  @Get()
  async check(): Promise<HealthResponse> {
    let dbStatus: 'healthy' | 'unhealthy' = 'unhealthy';

    try {
      // Try to execute a simple query
      // Simple liveness query against PostgreSQL
      await this.db.execute(sql`select 1`);
      dbStatus = 'healthy';
    } catch (error) {
      dbStatus = 'unhealthy';
    }

    const status: 'ok' | 'error' = dbStatus === 'healthy' ? 'ok' : 'error';

    return {
      status,
      timestamp: new Date().toISOString(),
      services: {
        database: {
          status: dbStatus,
          type: 'postgresql',
          details: { driver: 'drizzle-orm/node-postgres' },
        },
      },
    };
  }
}
