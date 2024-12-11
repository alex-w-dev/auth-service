import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ExtendedMessage, RMQMessage, RMQRoute, RMQService } from 'nestjs-rmq';
import { ApiTags } from '@nestjs/swagger';
import { DataSource, In, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { RequestUser } from '../common/decorators/request-user.decorator';
import { User } from '../auth-app/entities/user.entity';
import { OrderSaga, OrderSagaData } from '../common/sagas/order.saga';
import { catched, notify } from '../common/utils/rmq';
import { Public } from '../common/decorators/public.decorator';
import { DeliveryCourier } from './entities/delivery-courier.entity';
import { DeliveryReservedCourier } from './entities/delivery-reserved-courier.entity';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/modules/auth/enums/role.enum';

@ApiTags('delivery')
@Controller('delivery')
export class DeliveryAppController {
  constructor(
    private readonly rmqService: RMQService,
    @InjectRepository(DeliveryCourier)
    private DeliveryCourierRepo: Repository<DeliveryCourier>,
    @InjectRepository(DeliveryReservedCourier)
    private DeliveryReservedCourierRepo: Repository<DeliveryReservedCourier>,

    private dataSource: DataSource,
  ) {
    this.createCouriers();
  }

  async createCouriers(): Promise<void> {
    const couriers = [
      {
        id: 1,
        name: 'Alexander',
      },
    ];

    await this.DeliveryCourierRepo.save(couriers);
  }

  @Get('user/reserved-couriers/:orderId')
  async makeOrder(
    @RequestUser() requestUser: User,
    @Param('orderId') orderId: number,
  ): Promise<DeliveryReservedCourier[]> {
    const reservedCouriers = await this.DeliveryReservedCourierRepo.find({
      where: { userId: requestUser.id, orderId: +orderId },
    });

    return reservedCouriers;
  }

  @Roles(Role.COURIER)
  @Post('user/cancel-delivery/:orderId')
  async cancelDelivery(
    @Param('orderId') orderId: number,
  ): Promise<DeliveryReservedCourier> {
    const reservedCourier = await this.DeliveryReservedCourierRepo.findOne({
      where: { orderId: +orderId },
    });

    await notify(this.rmqService, OrderSaga.compensation, {
      order: {
        id: +orderId,
        userId: reservedCourier.userId,
      },
      compensation: {
        reason: 'User stopped delivery',
      },
    } as OrderSagaData);

    return reservedCourier;
  }

  @RMQRoute(OrderSaga.payment.paymentSuccess, { manualAck: true })
  async billingOrderPayedHandler(
    data: OrderSagaData,
    @RMQMessage msg: ExtendedMessage,
  ): Promise<void> {
    catched(OrderSaga.payment.paymentSuccess, data);

    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction('READ COMMITTED');

    try {
      if (data.orderData.courierTime < Date.now() / 1000) {
        throw new Error(
          `The courierTime ${new Date(+data.orderData.courierTime * 1000).toLocaleString().split(',')[0]} is incorrect `,
        );
      }

      let reservedCourier = await this.DeliveryReservedCourierRepo.findOne({
        where: {
          orderId: +data.order.id,
        },
      });

      if (reservedCourier) {
        // курьер для order уже забронирован
        return;
      }

      // тут нужно найти курьеров для заданного промежутка вермени (+ учитывать reserved) и выбрать одногоиз них
      const courier = (await this.DeliveryCourierRepo.find())[0];

      if (!courier) {
        throw new Error(`Not found couriers for order time`);
      }

      reservedCourier = this.DeliveryReservedCourierRepo.create({
        userId: +data.order.userId,
        orderId: +data.order.id,
        courierId: +courier.id,
        time: data.orderData.courierTime,
      });

      await queryRunner.manager.save(reservedCourier);

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

    try {
      await this.DeliveryReservedCourierRepo.delete({
        orderId: +data.order.id,
      });
    } catch (err) {
      console.error('Compensation error: ', err);
    }

    this.rmqService.ack(msg);
  }
}
