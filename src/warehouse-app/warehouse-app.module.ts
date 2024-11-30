import { Module } from '@nestjs/common';
import { WarehouseAppController } from './warehouse-app.controller';
import { WarehouseReservedProduct } from './entities/warehouse-reserved-product.entity';
import { WarehouseProduct } from './entities/warehouse-product.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../common/modules/auth/auth.module';
@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([WarehouseReservedProduct, WarehouseProduct]),
  ],
  controllers: [WarehouseAppController],
})
export class WarehouseAppModule {}
