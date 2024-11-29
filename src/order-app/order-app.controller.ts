import { Body, Controller, Post } from '@nestjs/common';
import { ExtendedMessage, RMQMessage, RMQRoute, RMQService } from 'nestjs-rmq';
import { ApiTags } from '@nestjs/swagger';
import { MakeOrderDto } from './dto/make-order.dto';
import { OrderOrder } from './entities/order.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { RequestUser } from '../common/decorators/request-user.decorator';
import { User } from '../auth-app/entities/user.entity';
import { OrderSaga } from '../common/sagas/order.saga';
import { notify } from '../common/utils/rmq';

@ApiTags('order')
@Controller('order')
export class OrderAppController {
  constructor(
    private readonly rmqService: RMQService,
    @InjectRepository(OrderOrder) private OrderRepo: Repository<OrderOrder>,
  ) {}

  @Post('user/make-order')
  async makeOrder(
    @RequestUser() requestUser: User,
    @Body() makeOrderDto: MakeOrderDto,
  ): Promise<OrderOrder> {
    const order = await this.OrderRepo.create({
      userId: requestUser.id,
      ...makeOrderDto,
    });
    const savedOrder = await this.OrderRepo.save(order);

    await this.createOrderInfoMQ(savedOrder);

    return savedOrder;
  }

  async createOrderInfoMQ(savedOrder: OrderOrder): Promise<void> {
    try {
      notify(this.rmqService, OrderSaga.order.orderCreated, {
        order: savedOrder,
      });
    } catch (e) {
      console.log(e, 'createOrderInfoMQ ERROR');
    }
  }

  // @RMQRoute('billing-order-payed', { manualAck: true })
  // async billingOrderPayedHandler(
  //   data: Record<string, string>,
  //   @RMQMessage msg: ExtendedMessage,
  // ): Promise<void> {
  //   console.log('billing-order-payed', data);
  //   this.rmqService.ack(msg);
  // }

  // @RMQRoute('billing-order-rejected', { manualAck: true })
  // async billingOrderRejectedHandler(
  //   data: Record<string, string>,
  //   @RMQMessage msg: ExtendedMessage,
  // ): Promise<void> {
  //   console.log('billing-order-rejected', data);
  //   this.rmqService.ack(msg);
  // }
}
