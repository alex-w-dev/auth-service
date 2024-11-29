import { Module } from '@nestjs/common';
import { PaymentAppController } from './payment-app.controller';
import { PaymentPayment } from './entities/payment.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../common/modules/auth/auth.module';
@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([PaymentPayment])],
  controllers: [PaymentAppController],
})
export class PaymentAppModule {}
