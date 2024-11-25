import { Body, Controller, Get, Post } from '@nestjs/common';
import { ExtendedMessage, RMQMessage, RMQRoute, RMQService } from 'nestjs-rmq';
import { ApiTags } from '@nestjs/swagger';
import { NotificationNotification } from './entities/notification.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { RequestUser } from '../common/decorators/request-user.decorator';
import { User } from '../auth-app/entities/user.entity';
import { OrderOrder } from '../order-app/entities/order.entity';

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

  @RMQRoute('billing-order-payed', { manualAck: true })
  async billingOrderPayedHandler(
    data: { order: OrderOrder },
    @RMQMessage msg: ExtendedMessage,
  ): Promise<void> {
    const notification = await this.repo.create({
      userId: +data.order.userId,
      type: 'success',
      text: 'Successfully payid your order',
    });
    this.repo.save(notification);

    console.log('billing-order-payed', data);
    this.rmqService.ack(msg);
  }

  @RMQRoute('billing-order-rejected', { manualAck: true })
  async billingOrderRejectedHandler(
    data: { order: OrderOrder; reason: string },
    @RMQMessage msg: ExtendedMessage,
  ): Promise<void> {
    const notification = await this.repo.create({
      userId: +data.order.userId,
      type: 'error',
      text: 'Not payed your order',
    });
    this.repo.save(notification);
    console.log('billing-order-rejected', data);
    this.rmqService.ack(msg);
  }
}
