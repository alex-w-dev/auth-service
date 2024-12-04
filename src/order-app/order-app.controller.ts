import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
} from '@nestjs/common';
import { ExtendedMessage, RMQMessage, RMQRoute, RMQService } from 'nestjs-rmq';
import { ApiTags } from '@nestjs/swagger';
import { MakeOrderDto } from './dto/make-order.dto';
import { OrderOrder } from './entities/order.entity';
import { LessThan, MoreThan, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { RequestUser } from '../common/decorators/request-user.decorator';
import { User } from '../auth-app/entities/user.entity';
import { OrderSaga, OrderSagaData } from '../common/sagas/order.saga';
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
    const orderData = JSON.stringify(makeOrderDto.data);
    const someTimeAge = Date.now() - 600_000; //  10 minutes
    const existsingOrder = await this.OrderRepo.findOne({
      where: {
        userId: +requestUser.id,
        jsonData: orderData,
        createdAtUnixTime: MoreThan(someTimeAge),
      },
    });

    if (existsingOrder && !makeOrderDto.doubleAccepted) {
      throw new BadRequestException('Order is already exists');
    }

    const order = await this.OrderRepo.create({
      userId: +requestUser.id,
      cost: makeOrderDto.cost,
      jsonData: orderData,
      createdAtUnixTime: Date.now(),
    });
    const savedOrder = await this.OrderRepo.save(order);

    await this.createOrderInfoMQ(savedOrder, makeOrderDto.data);

    return savedOrder;
  }

  @Get('user/orders')
  async getUserOrders(@RequestUser() requestUser: User): Promise<OrderOrder[]> {
    return await this.OrderRepo.find({
      where: {
        userId: +requestUser.id,
      },
    });
  }

  async createOrderInfoMQ(
    savedOrder: OrderOrder,
    orderData: OrderSagaData['orderData'],
  ): Promise<void> {
    try {
      notify(this.rmqService, OrderSaga.order.orderCreated, {
        order: savedOrder,
        orderData,
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
