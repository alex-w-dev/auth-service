import { Module } from '@nestjs/common';
import { BillingAppController } from './billing-app.controller';
import * as path from 'path';
import { BillingUser } from './entities/billing-user.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../common/modules/auth/auth.module';
import { BillingTransaction } from './entities/billing-transaction.entity';
console.log(path.join(__dirname, '../../.env.billing-app'));
@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([BillingUser, BillingTransaction]),
  ],
  controllers: [BillingAppController],
})
export class BillingAppModule {}
