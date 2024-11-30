import { Body, Controller, Get, Param } from '@nestjs/common';
import { ExtendedMessage, RMQMessage, RMQRoute, RMQService } from 'nestjs-rmq';
import { ApiTags } from '@nestjs/swagger';
import { WarehouseReservedProduct } from './entities/warehouse-reserved-product.entity';
import { WarehouseProduct } from './entities/warehouse-product.entity';
import { DataSource, In, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { RequestUser } from '../common/decorators/request-user.decorator';
import { User } from '../auth-app/entities/user.entity';
import { OrderSaga, OrderSagaData } from '../common/sagas/order.saga';
import { catched, notify } from '../common/utils/rmq';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('warehouse')
@Controller('warehouse')
export class WarehouseAppController {
  constructor(
    private readonly rmqService: RMQService,
    @InjectRepository(WarehouseProduct)
    private WarehouseProductRepo: Repository<WarehouseProduct>,
    @InjectRepository(WarehouseReservedProduct)
    private WarehouseReservedProductRepo: Repository<WarehouseReservedProduct>,

    private dataSource: DataSource,
  ) {
    this.createProducts();
  }

  async createProducts(): Promise<void> {
    const products = [
      {
        id: 1,
        name: 'Product',
        count: 999999,
        cost: 100,
      },
      {
        id: 2,
        name: 'Zero Products',
        count: 0,
        cost: 100,
      },
    ];

    await this.WarehouseProductRepo.save(products);
  }

  @Public()
  @Get('products')
  async getAllProducts(): Promise<WarehouseProduct[]> {
    const products = await this.WarehouseProductRepo.find();

    return products;
  }

  @Get('user/reserved-products/:orderId')
  async makeOrder(
    @RequestUser() requestUser: User,
    @Param('orderId') orderId: number,
  ): Promise<WarehouseReservedProduct[]> {
    const reservedProducts = await this.WarehouseReservedProductRepo.find({
      where: { userId: requestUser.id, orderId: +orderId },
    });

    return reservedProducts;
  }

  @RMQRoute(OrderSaga.order.orderCreated, { manualAck: true })
  async billingOrderPayedHandler(
    data: OrderSagaData,
    @RMQMessage msg: ExtendedMessage,
  ): Promise<void> {
    catched(OrderSaga.order.orderCreated, data);

    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction('READ COMMITTED');

    try {
      for (const orderProduct of data.orderData.products) {
        const product = await this.WarehouseProductRepo.findOne({
          where: { id: +orderProduct.productId },
        });

        if (!product) {
          throw new Error(`Product ${orderProduct.productId} not found`);
        }

        if (product.count < +orderProduct.count) {
          throw new Error(
            `Not enough products: product ${product.id} has ${product.count} and you want ${orderProduct.count}`,
          );
        }

        if (product.cost !== +orderProduct.cost) {
          throw new Error(
            `Not right cost: product ${product.id} has ${product.cost} and you want ${orderProduct.cost}`,
          );
        }

        product.count -= +orderProduct.count;
        await queryRunner.manager.save(product);

        const reservedProduct = this.WarehouseReservedProductRepo.create({
          userId: +data.order.userId,
          orderId: +data.order.id,
          count: +orderProduct.count,
          cost: +orderProduct.cost,
          productId: +orderProduct.productId,
        });

        await queryRunner.manager.save(reservedProduct);
      }

      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      await notify(this.rmqService, OrderSaga.compensation, {
        ...data,
        compensation: {
          reason: err.toString(),
        },
      } as OrderSagaData);
    } finally {
      await queryRunner.release();
    }

    this.rmqService.ack(msg);
  }

  @RMQRoute(OrderSaga.compensation, { manualAck: true })
  async billingOrderRejectedHandler(
    data: OrderSagaData,
    @RMQMessage msg: ExtendedMessage,
  ): Promise<void> {
    catched(OrderSaga.compensation, data);

    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction('READ COMMITTED');

    try {
      const reservedProducts = await this.WarehouseReservedProductRepo.find({
        where: { orderId: +data.order.id },
      });
      const products = await this.WarehouseProductRepo.find({
        where: { id: In([...reservedProducts.map((rp) => rp.productId)]) },
      });

      for (const product of products) {
        product.count += reservedProducts.find(
          (rp) => rp.productId === product.id,
        ).count;
        await queryRunner.manager.save(product);
      }

      await this.WarehouseReservedProductRepo.remove(reservedProducts);

      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      console.error('Compensation error: ', err);
    } finally {
      await queryRunner.release();
    }

    this.rmqService.ack(msg);
  }
}
