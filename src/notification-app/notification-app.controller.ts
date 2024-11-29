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
    console.log(`Catched ${OrderSaga.billing.paymentPayed}`);
    const notification = await this.repo.create({
      userId: +data.order.userId,
      type: 'success',
      text: 'Successfully payid your order',
    });
    this.repo.save(notification);
    this.rmqService.ack(msg);
  }

  @RMQRoute(OrderSaga.billing.paymentRejected, { manualAck: true })
  async billingOrderRejectedHandler(
    data: OrderSagaData,
    @RMQMessage msg: ExtendedMessage,
  ): Promise<void> {
    console.log(`Catched ${OrderSaga.billing.paymentRejected}`);
    const notification = await this.repo.create({
      userId: +data.order.userId,
      type: 'error',
      text: 'Not payed your order',
    });
    this.repo.save(notification);
    this.rmqService.ack(msg);
  }

  @RMQRoute(OrderSaga.billing.paymentCompensated, { manualAck: true })
  async billingPaymentCompensatedHandler(
    data: OrderSagaData,
    @RMQMessage msg: ExtendedMessage,
  ): Promise<void> {
    console.log(`Catched ${OrderSaga.billing.paymentCompensated}`);
    const notification = await this.repo.create({
      userId: +data.order.userId,
      type: 'success',
      text: 'Your bill compensated',
    });
    this.repo.save(notification);
    this.rmqService.ack(msg);
  }
}
