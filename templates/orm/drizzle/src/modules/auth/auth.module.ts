import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from 'src/modules/auth/auth.controller';
import { AuthService } from 'src/modules/auth/auth.service';
import { PersistenceModule } from '../persistence/persistence.module';

@Module({
  imports: [PersistenceModule, JwtModule.register({})],
  controllers: [AuthController],
  providers: [
    AuthService,
  ],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
