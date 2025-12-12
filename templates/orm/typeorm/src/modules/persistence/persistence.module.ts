import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { TypeOrmUserRepository } from '../../repositories/user.repository';
import { TypeOrmRefreshTokenRepository } from '../../repositories/refresh-token.repository';
import { USER_REPOSITORY, REFRESH_TOKEN_REPOSITORY } from '../../common/interfaces/repository.interface';

@Module({
  imports: [DatabaseModule],
  providers: [
    {
      provide: USER_REPOSITORY,
      useClass: TypeOrmUserRepository,
    },
    {
      provide: REFRESH_TOKEN_REPOSITORY,
      useClass: TypeOrmRefreshTokenRepository,
    },
  ],
  exports: [USER_REPOSITORY, REFRESH_TOKEN_REPOSITORY, DatabaseModule],
})
export class PersistenceModule {}
