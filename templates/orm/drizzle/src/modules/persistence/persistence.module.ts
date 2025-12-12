import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { DrizzleUserRepository } from '../../repositories/user.repository';
import { DrizzleRefreshTokenRepository } from '../../repositories/refresh-token.repository';
import { USER_REPOSITORY, REFRESH_TOKEN_REPOSITORY } from '../../common/interfaces/repository.interface';

@Module({
  imports: [DatabaseModule],
  providers: [
    {
      provide: USER_REPOSITORY,
      useClass: DrizzleUserRepository,
    },
    {
      provide: REFRESH_TOKEN_REPOSITORY,
      useClass: DrizzleRefreshTokenRepository,
    },
  ],
  exports: [USER_REPOSITORY, REFRESH_TOKEN_REPOSITORY, DatabaseModule],
})
export class PersistenceModule {}
