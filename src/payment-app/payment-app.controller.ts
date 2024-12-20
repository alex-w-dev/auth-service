import { Body, Controller, Get, Post } from '@nestjs/common';
import { ExtendedMessage, RMQMessage, RMQRoute, RMQService } from 'nestjs-rmq';
import { ApiTags } from '@nestjs/swagger';
import { PaymentPayment } from './entities/payment.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { RequestUser } from '../common/decorators/request-user.decorator';
import { User } from '../auth-app/entities/user.entity';
import { OrderOrder } from '../order-app/entities/order.entity';
import { OrderSaga, OrderSagaData } from '../common/sagas/order.saga';
import { catched, notify } from '../common/utils/rmq';

@ApiTags('payment')
@Controller('payment')
export class PaymentAppController {
  constructor(
    private readonly rmqService: RMQService,
    @InjectRepository(PaymentPayment)
    private repo: Repository<PaymentPayment>,
  ) {}

  @Get('user/payments')
  async makeOrder(@RequestUser() requestUser: User): Promise<PaymentPayment[]> {
    const payments = await this.repo.find({
      where: { userId: requestUser.id },
      order: { id: 'DESC' },
    });

    return payments;
  }

  @RMQRoute(OrderSaga.warehouse.productReserved, { manualAck: true })
  async orderCreatedHandler(
    data: { order: OrderOrder },
    @RMQMessage msg: ExtendedMessage,
  ): Promise<void> {
    catched(OrderSaga.warehouse.productReserved, data);
    const payment = await this.repo.create({
      userId: +data.order.userId,
      orderId: +data.order.id,
    });
    const saved = await this.repo.save(payment);

    notify(this.rmqService, OrderSaga.payment.paymentCreated, {
      ...data,
      payment: saved,
    });

    this.rmqService.ack(msg);
  }

  @RMQRoute(OrderSaga.billing.paymentPayed, { manualAck: true })
  async billingOrderPayedHandler(
    data: OrderSagaData,
    @RMQMessage msg: ExtendedMessage,
  ): Promise<void> {
    catched(OrderSaga.billing.paymentPayed, data);
    try {
      const payment = await this.repo.findOne({
        where: {
          id: +data.payment.id,
        },
      });
      payment.payed = 1;
      const saved = await this.repo.save(payment);

      notify(this.rmqService, OrderSaga.payment.paymentSuccess, {
        ...data,
        payment: saved,
      });
    } catch (e) {
      console.log(e);
    }
    this.rmqService.ack(msg);
  }

  @RMQRoute(OrderSaga.billing.paymentCompensated, { manualAck: true })
  async billingPaymentCompensatedHandler(
    data: OrderSagaData,
    @RMQMessage msg: ExtendedMessage,
  ): Promise<void> {
    catched(OrderSaga.billing.paymentCompensated, data);

    try {
      const payment = await this.repo.findOne({
        where: {
          orderId: +data.order.id,
        },
      });
      payment.payed = 0;
      const saved = await this.repo.save(payment);
    } catch (e) {
      console.log(e);
    }

    // notify(this.rmqService, OrderSaga.payment.paymentSuccess, {
    //   ...data,
    //   payment: saved,
    // });
    this.rmqService.ack(msg);
  }

  @RMQRoute(OrderSaga.billing.paymentRejected, { manualAck: true })
  async billingOrderRejectedHandler(
    data: { payment: PaymentPayment; reason: string },
    @RMQMessage msg: ExtendedMessage,
  ): Promise<void> {
    catched(OrderSaga.billing.paymentRejected, data);
    // ничего не происходит, потому что .payed = 0  по дефолту
    notify(this.rmqService, OrderSaga.payment.paymentFailure, data);
    this.rmqService.ack(msg);
  }

  // @RMQRoute(OrderSaga.comensation, { manualAck: true })
  // async orderSagaComensationHandler(
  //   data: OrderSagaData,
  //   @RMQMessage msg: ExtendedMessage,
  // ): Promise<void> {
  //   catched(OrderSaga.comensation, data);
  //   notify(this.rmqService, OrderSaga.payment.paymentNeedsToCompensate, data);

  //   this.rmqService.ack(msg);
  // }
}
