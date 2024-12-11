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
import { catched, notify } from '../common/utils/rmq';

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
    const someTimeAge = Date.now() - 60_000; //  1 minute
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
      order: {
        id: 'DESC',
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

  @RMQRoute(OrderSaga.billing.paymentPayed, { manualAck: true })
  async billingOrderPayedHandler(
    data: OrderSagaData,
    @RMQMessage msg: ExtendedMessage,
  ): Promise<void> {
    catched(OrderSaga.billing.paymentPayed, data);

    const order = await this.OrderRepo.findOne({
      where: {
        id: +data.order.id,
      },
    });

    order.payed = 1;

    await this.OrderRepo.save(order);

    this.rmqService.ack(msg);
  }

  @RMQRoute(OrderSaga.warehouse.courierTakesOrder, { manualAck: true })
  async warehouseCourierTakesOrderHandler(
    data: OrderSagaData,
    @RMQMessage msg: ExtendedMessage,
  ): Promise<void> {
    catched(OrderSaga.warehouse.courierTakesOrder, data);

    const order = await this.OrderRepo.findOne({
      where: {
        id: +data.order.id,
      },
    });

    order.courierId = data.courier.id;

    await this.OrderRepo.save(order);

    this.rmqService.ack(msg);
  }

  @RMQRoute(OrderSaga.warehouse.courierDeliveredOrder, { manualAck: true })
  async warehouseCourierDeliveredOrder(
    data: OrderSagaData,
    @RMQMessage msg: ExtendedMessage,
  ): Promise<void> {
    catched(OrderSaga.warehouse.courierDeliveredOrder, data);

    const order = await this.OrderRepo.findOne({
      where: {
        id: +data.order.id,
      },
    });

    order.delivered = 1;

    await this.OrderRepo.save(order);

    this.rmqService.ack(msg);
  }

  @RMQRoute(OrderSaga.compensation, { manualAck: true })
  async compensatationHandler(
    data: OrderSagaData,
    @RMQMessage msg: ExtendedMessage,
  ): Promise<void> {
    catched(OrderSaga.compensation, data);

    const order = await this.OrderRepo.findOne({
      where: {
        id: +data.order.id,
      },
    });

    order.delivered = 0;
    order.payed = 0;
    order.closed = 1;

    await this.OrderRepo.save(order);

    this.rmqService.ack(msg);
  }
  // @RMQRoute('billing-order-rejected', { manualAck: true })
  // async billingOrderRejectedHandler(
  //   data: Record<string, string>,
  //   @RMQMessage msg: ExtendedMessage,
  // ): Promise<void> {
  //   console.log('billing-order-rejected', data);
  //   this.rmqService.ack(msg);
  // }
}
