import { Body, Controller, Get, Param, Post } from '@nestjs/common';
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
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/modules/auth/enums/role.enum';

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
        name: 'Вишня',
        imageUrl:
          'https://images.unsplash.com/photo-1528821128474-27f963b062bf?fm=jpg&q=60&w=3000&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTJ8fGZydWl0fGVufDB8fDB8fHww',
        count: 1000,
        cost: 100,
      },
      {
        id: 2,
        name: 'Яблоко',
        imageUrl:
          'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQevdmWczucZ-LpPAMhNbG3lKuvf7vvfwH7lIQx9mRNO2N5orYWS16e4Ix4r008d8q1N3hAGLpEE6SlS629gmZeUgCtWLjWMvEP8lDE2A',
        count: 0,
        cost: 100,
      },
      {
        id: 3,
        name: 'Банан',
        imageUrl:
          'https://encrypted-tbn2.gstatic.com/images?q=tbn:ANd9GcRLMh2HVEwZGGHwka3GR3JuO2K3VfNbbvU1W_2f9JLo1GR9Jmb8G781_g7wtlkHGy91l4FqyxQLpJBTZophCXcJSKCXQ7zDffZzf6GoJIU',
        count: 553,
        cost: 1400,
      },
    ];

    await this.WarehouseProductRepo.save(products);

    // await this.WarehouseReservedProductRepo.delete({});
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

  @Roles(Role.COURIER)
  @Get('courier/reserved-products/grouped-by-order')
  async getReserverProducts(): Promise<any[]> {
    const reservedProducts = await this.WarehouseReservedProductRepo.find({
      where: { courierId: 0 },
    });

    const orders = reservedProducts.reduce(function (r, a) {
      r[a.orderId] = r[a.orderId] || [];
      r[a.orderId].push(a);
      return r;
    }, Object.create(null));

    const preparedOreders = Object.keys(orders).map((orderId) => ({
      orderId: +orderId,
      products: orders[orderId],
      cost: orders[orderId].reduce((accum, product) => {
        return product.count * product.cost + accum;
      }, 0),
    }));

    console.log(preparedOreders);

    return preparedOreders;
  }

  @Roles(Role.COURIER)
  @Get('courier/delivery-products/grouped-by-order')
  async getDeliveryProducts(@RequestUser() requestUser: User): Promise<any[]> {
    const reservedProducts = await this.WarehouseReservedProductRepo.find({
      where: { courierId: +requestUser.id, delivered: 0 },
    });

    const orders = reservedProducts.reduce(function (r, a) {
      r[a.orderId] = r[a.orderId] || [];
      r[a.orderId].push(a);
      return r;
    }, Object.create(null));

    const preparedOreders = Object.keys(orders).map((orderId) => ({
      orderId: +orderId,
      products: orders[orderId],
      cost: orders[orderId].reduce((accum, product) => {
        return product.count * product.cost + accum;
      }, 0),
    }));

    return preparedOreders;
  }

  @Roles(Role.COURIER)
  @Post('courier/take-order/:orderId')
  async courierTakeOrder(
    @RequestUser() requestUser: User,
    @Param('orderId') orderId: number,
  ): Promise<WarehouseReservedProduct[]> {
    // TODO wrap to transaction
    const reservedProducts = await this.getOrderReservedProducts(orderId);

    let userId = 0;
    reservedProducts.forEach((product) => {
      product.courierId = +requestUser.id;
      userId = product.userId;
    });

    this.WarehouseReservedProductRepo.save(reservedProducts);

    notify(this.rmqService, OrderSaga.warehouse.courierTakesOrder, {
      order: {
        // todo: save order saga data before it and then send all data
        id: +orderId,
        userId: userId,
      },
      courier: {
        id: +requestUser.id,
      },
    } as OrderSagaData);

    return reservedProducts;
  }

  @Roles(Role.COURIER)
  @Post('courier/deliver-order/:orderId')
  async courierDeliverOrder(
    @RequestUser() requestUser: User,
    @Param('orderId') orderId: number,
  ): Promise<WarehouseReservedProduct[]> {
    // TODO wrap to transaction
    const reservedProducts = await this.getOrderReservedProducts(orderId);

    let userId = 0;
    reservedProducts.forEach((product) => {
      product.delivered = 1;
      userId = product.userId;
    });

    this.WarehouseReservedProductRepo.save(reservedProducts);

    notify(this.rmqService, OrderSaga.warehouse.courierDeliveredOrder, {
      order: {
        // todo: save order saga data before it and then send all data
        id: +orderId,
        userId: userId,
      },
    } as OrderSagaData);

    return reservedProducts;
  }

  @Roles(Role.COURIER)
  @Get('courier/reserved-products/:orderId')
  async getOrderReservedProducts(
    @Param('orderId') orderId: number,
  ): Promise<WarehouseReservedProduct[]> {
    const reservedProducts = await this.WarehouseReservedProductRepo.find({
      where: { orderId: +orderId },
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

        const existsingReservedProduct =
          await this.WarehouseReservedProductRepo.findOne({
            where: {
              userId: +data.order.userId,
              orderId: +data.order.id,
              productId: +orderProduct.productId,
            },
          });

        if (existsingReservedProduct) {
          // this product is reserved fro this order
          console.log('product reserved - continue');
          continue;
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
        console.log('product reserved');
      }

      await queryRunner.commitTransaction();
      await notify(this.rmqService, OrderSaga.warehouse.productReserved, {
        ...data,
      } as OrderSagaData);
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

      console.log();

      await queryRunner.manager.remove(reservedProducts);

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
