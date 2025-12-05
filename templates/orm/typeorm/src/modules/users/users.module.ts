import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from 'src/modules/users/users.controller';
import { UsersService } from 'src/modules/users/users.service';
import { User } from 'src/entities/user.entity';
import { RefreshToken } from 'src/entities/refresh-token.entity';
import { TypeOrmUserRepository } from 'src/repositories/user.repository';
import { TypeOrmRefreshTokenRepository } from 'src/repositories/refresh-token.repository';
import {
  USER_REPOSITORY,
  REFRESH_TOKEN_REPOSITORY,
} from 'src/common/interfaces/repository.interface';

@Module({
  imports: [TypeOrmModule.forFeature([User, RefreshToken])],
  controllers: [UsersController],
  providers: [
    UsersService,
    {
      provide: USER_REPOSITORY,
      useClass: TypeOrmUserRepository,
    },
    {
      provide: REFRESH_TOKEN_REPOSITORY,
      useClass: TypeOrmRefreshTokenRepository,
    },
  ],
  exports: [UsersService],
})
export class UsersModule {}
