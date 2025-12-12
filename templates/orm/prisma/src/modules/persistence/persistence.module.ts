import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { PrismaUserRepository } from '../../repositories/user.repository';
import { PrismaRefreshTokenRepository } from '../../repositories/refresh-token.repository';
import { USER_REPOSITORY, REFRESH_TOKEN_REPOSITORY } from '../../common/interfaces/repository.interface';

@Module({
  imports: [PrismaModule],
  providers: [
    {
      provide: USER_REPOSITORY,
      useClass: PrismaUserRepository,
    },
    {
      provide: REFRESH_TOKEN_REPOSITORY,
      useClass: PrismaRefreshTokenRepository,
    },
  ],
  exports: [USER_REPOSITORY, REFRESH_TOKEN_REPOSITORY, PrismaModule],
})
export class PersistenceModule {}
