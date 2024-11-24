import { Module } from '@nestjs/common';
import { BillingAppController } from './billing-app.controller';
import * as path from 'path';
import { BillingUser } from './entities/user.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../common/modules/auth/auth.module';
console.log(path.join(__dirname, '../../.env.billing-app'));
@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([BillingUser]),
    //JwtModule.registerAsync(jwtConfig.asProvider()),
    //ConfigModule.forFeature(jwtConfig),
  ],
  controllers: [BillingAppController],
  //providers: [JwtStrategy],
})
export class BillingAppModule {}
