import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DatabaseModule } from '../../database/database.module';
import { User, UserSchema } from '../../schemas/user.schema';
import { RefreshToken, RefreshTokenSchema } from '../../schemas/refresh-token.schema';
import { MongooseUserRepository } from '../../repositories/user.repository';
import { MongooseRefreshTokenRepository } from '../../repositories/refresh-token.repository';
import { USER_REPOSITORY, REFRESH_TOKEN_REPOSITORY } from '../../common/interfaces/repository.interface';

@Module({
  imports: [
    DatabaseModule,
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: RefreshToken.name, schema: RefreshTokenSchema },
    ]),
  ],
  providers: [
    {
      provide: USER_REPOSITORY,
      useClass: MongooseUserRepository,
    },
    {
      provide: REFRESH_TOKEN_REPOSITORY,
      useClass: MongooseRefreshTokenRepository,
    },
  ],
  exports: [USER_REPOSITORY, REFRESH_TOKEN_REPOSITORY, DatabaseModule, MongooseModule],
})
export class PersistenceModule {}
