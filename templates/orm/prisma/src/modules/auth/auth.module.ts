import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from 'src/modules/auth/auth.controller';
import { AuthService } from 'src/modules/auth/auth.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { PrismaUserRepository } from 'src/repositories/user.repository';
import { PrismaRefreshTokenRepository } from 'src/repositories/refresh-token.repository';
import {
  USER_REPOSITORY,
  REFRESH_TOKEN_REPOSITORY,
} from 'src/common/interfaces/repository.interface';

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      global: true,
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    {
      provide: USER_REPOSITORY,
      useClass: PrismaUserRepository,
    },
    {
      provide: REFRESH_TOKEN_REPOSITORY,
      useClass: PrismaRefreshTokenRepository,
    },
  ],
  exports: [AuthService, USER_REPOSITORY, REFRESH_TOKEN_REPOSITORY],
})
export class AuthModule {}
