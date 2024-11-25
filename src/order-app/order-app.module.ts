import { Module } from '@nestjs/common';
import { OrderAppController } from './order-app.controller';
import * as path from 'path';
import { OderOrder } from './entities/order.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../common/modules/auth/auth.module';
console.log(path.join(__dirname, '../../.env.billing-app'));
@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([OderOrder])],
  controllers: [OrderAppController],
})
export class OrderAppModule {}
