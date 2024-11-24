import { Module } from '@nestjs/common';
import { BillingAppController } from './billing-app.controller';
import * as path from 'path';
import { BillingUser } from './entities/user.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import jwtConfig from '../auth-app/auth/config/jwt.config';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { JwtStrategy } from '../auth-app/auth/strategies/jwt.strategy';
import { AuthModule } from '../auth-app/auth/auth.module';
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
