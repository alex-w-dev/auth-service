import { Module } from '@nestjs/common';
import { BillingAppController } from './billing-app.controller';
import * as path from 'path';
console.log(path.join(__dirname, '../../.env.billing-app'));
@Module({
  imports: [],
  controllers: [BillingAppController],
})
export class BillingAppModule {}
