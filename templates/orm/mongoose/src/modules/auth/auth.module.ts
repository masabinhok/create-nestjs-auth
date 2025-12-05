import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthController } from 'src/modules/auth/auth.controller';
import { AuthService } from 'src/modules/auth/auth.service';
import { User, UserSchema } from 'src/schemas/user.schema';
import { RefreshToken, RefreshTokenSchema } from 'src/schemas/refresh-token.schema';
import { MongooseUserRepository } from 'src/repositories/user.repository';
import { MongooseRefreshTokenRepository } from 'src/repositories/refresh-token.repository';
import {
  USER_REPOSITORY,
  REFRESH_TOKEN_REPOSITORY,
} from 'src/common/interfaces/repository.interface';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: RefreshToken.name, schema: RefreshTokenSchema },
    ]),
    JwtModule.register({}),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    {
      provide: USER_REPOSITORY,
      useClass: MongooseUserRepository,
    },
    {
      provide: REFRESH_TOKEN_REPOSITORY,
      useClass: MongooseRefreshTokenRepository,
    },
  ],
  exports: [AuthService, JwtModule, USER_REPOSITORY, REFRESH_TOKEN_REPOSITORY],
})
export class AuthModule {}
