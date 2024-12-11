import { Body, Controller, Get, Post } from '@nestjs/common';
import { ExtendedMessage, RMQMessage, RMQRoute, RMQService } from 'nestjs-rmq';
import { ApiTags } from '@nestjs/swagger';
import { NotificationNotification } from './entities/notification.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { RequestUser } from '../common/decorators/request-user.decorator';
import { User } from '../auth-app/entities/user.entity';
import { OrderOrder } from '../order-app/entities/order.entity';
import { OrderSaga, OrderSagaData } from '../common/sagas/order.saga';
import { catched } from '../common/utils/rmq';

@ApiTags('notification')
@Controller('notification')
export class NotificationAppController {
  constructor(
    private readonly rmqService: RMQService,
    @InjectRepository(NotificationNotification)
    private repo: Repository<NotificationNotification>,
  ) {}

  @Get('user/notifications')
  async makeOrder(
    @RequestUser() requestUser: User,
  ): Promise<NotificationNotification[]> {
    const notifications = await this.repo.find({
      where: { userId: requestUser.id },
      order: { id: 'DESC' },
    });

    return notifications;
  }

  @RMQRoute(OrderSaga.billing.paymentPayed, { manualAck: true })
  async billingOrderPayedHandler(
    data: OrderSagaData,
    @RMQMessage msg: ExtendedMessage,
  ): Promise<void> {
    catched(OrderSaga.billing.paymentPayed, data);
    const notification = await this.repo.create({
      userId: +data.order.userId,
      type: 'success',
      text: `Successfully payid your order #${data.order.id}`,
    });
    this.repo.save(notification);
    this.rmqService.ack(msg);
  }

  @RMQRoute(OrderSaga.warehouse.courierTakesOrder, { manualAck: true })
  async bwarehouseCourierTakesOrderHandler(
    data: OrderSagaData,
    @RMQMessage msg: ExtendedMessage,
  ): Promise<void> {
    catched(OrderSaga.warehouse.courierTakesOrder, data);
    const notification = await this.repo.create({
      userId: +data.order.userId,
      type: 'success',
      text: `Courier taked order #${data.order.id}`,
    });
    this.repo.save(notification);
    this.rmqService.ack(msg);
  }

  @RMQRoute(OrderSaga.warehouse.courierDeliveredOrder, { manualAck: true })
  async bwarehouseCourierDeliveredOrderHandler(
    data: OrderSagaData,
    @RMQMessage msg: ExtendedMessage,
  ): Promise<void> {
    catched(OrderSaga.warehouse.courierDeliveredOrder, data);
    const notification = await this.repo.create({
      userId: +data.order.userId,
      type: 'success',
      text: `Order #${data.order.id} is delivered`,
    });
    this.repo.save(notification);
    this.rmqService.ack(msg);
  }
  @RMQRoute(OrderSaga.billing.paymentRejected, { manualAck: true })
  async billingOrderRejectedHandler(
    data: OrderSagaData,
    @RMQMessage msg: ExtendedMessage,
  ): Promise<void> {
    catched(OrderSaga.billing.paymentRejected, data);

    const notification = await this.repo.create({
      userId: +data.order.userId,
      type: 'error',
      text: `Not payed your order #${data.order.id}`,
    });
    this.repo.save(notification);
    this.rmqService.ack(msg);
  }

  @RMQRoute(OrderSaga.billing.paymentCompensated, { manualAck: true })
  async billingPaymentCompensatedHandler(
    data: OrderSagaData,
    @RMQMessage msg: ExtendedMessage,
  ): Promise<void> {
    catched(OrderSaga.billing.paymentCompensated, data);

    const notification = await this.repo.create({
      userId: +data.order.userId,
      type: 'success',
      text:
        'Your bill is compensated: ' +
        (data.compensation?.reason || 'no reason'),
    });
    this.repo.save(notification);
    this.rmqService.ack(msg);
  }

  @RMQRoute(OrderSaga.compensation, { manualAck: true })
  async sagaCompensated(
    data: OrderSagaData,
    @RMQMessage msg: ExtendedMessage,
  ): Promise<void> {
    catched(OrderSaga.billing.paymentCompensated, data);

    const notification = await this.repo.create({
      userId: +data.order.userId,
      type: 'error',
      text:
        `Order #${data.order.id} is closed: ` +
        (data.compensation?.reason || 'no reason'),
    });
    this.repo.save(notification);
    this.rmqService.ack(msg);
  }
}
