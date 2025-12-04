import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { AuthModule } from './modules/auth/auth.module';
import { LoggerModule } from 'nestjs-pino';
import { DatabaseModule } from './database/database.module';
import { UsersModule } from './modules/users/users.module';
import { HealthModule } from './modules/health/health.module';
import { AppConfigModule } from './config/config.module';
import { loggerConfig } from './config/logger.config';
import { CorrelationIdMiddleware } from './common/middleware/correlation-id.middleware';
import { RolesGuard } from './common/guards/roles.guard';
import { AuthGuard } from './common/guards/auth.guard';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';

@Module({
  imports: [
    LoggerModule.forRoot(loggerConfig),
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000,
        limit: 10,
      },
      {
        name: 'strict',
        ttl: 60000,
        limit: 5,
      },
    ]),
    AppConfigModule,
    DatabaseModule,
    AuthModule,
    UsersModule,
    HealthModule,
  ],
  controllers: [],
  providers: [
    {
      provide: 'APP_GUARD',
      useClass: ThrottlerGuard,
    },
    {
      provide: 'APP_GUARD',
      useClass: AuthGuard,
    },
    {
      provide: 'APP_GUARD',
      useClass: RolesGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
