import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

/**
 * Base Users Module - will be extended by ORM-specific modules
 * The ORM adapter must provide USER_REPOSITORY and REFRESH_TOKEN_REPOSITORY
 */
@Module({
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
