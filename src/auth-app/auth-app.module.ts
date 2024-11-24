import { Module } from '@nestjs/common';
import { UserModule } from './user/user.module';
import { AuthModule } from '../common/modules/auth/auth.module';

@Module({
  imports: [UserModule, AuthModule],
})
export class AuthAppModule {}
