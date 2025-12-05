import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersController } from 'src/modules/users/users.controller';
import { UsersService } from 'src/modules/users/users.service';
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
  ],
  controllers: [UsersController],
  providers: [
    UsersService,
    MongooseUserRepository,
    MongooseRefreshTokenRepository,
    {
      provide: USER_REPOSITORY,
      useClass: MongooseUserRepository,
    },
    {
      provide: REFRESH_TOKEN_REPOSITORY,
      useClass: MongooseRefreshTokenRepository,
    },
  ],
  exports: [UsersService, USER_REPOSITORY, REFRESH_TOKEN_REPOSITORY],
})
export class UsersModule {}
