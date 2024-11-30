import { Module } from '@nestjs/common';
import { DeliveryAppController } from './delivery-app.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../common/modules/auth/auth.module';
import { DeliveryReservedCourier } from './entities/delivery-reserved-courier.entity';
import { DeliveryCourier } from './entities/delivery-courier.entity';
@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([DeliveryReservedCourier, DeliveryCourier]),
  ],
  controllers: [DeliveryAppController],
})
export class DeliveryAppModule {}
