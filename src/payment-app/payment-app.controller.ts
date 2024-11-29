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

@ApiTags('notification')
@Controller('notification')
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

  @RMQRoute(OrderSaga.order.orderCreated, { manualAck: true })
  async orderCreatedHandler(
    data: { order: OrderOrder },
    @RMQMessage msg: ExtendedMessage,
  ): Promise<void> {
    console.log(`Catched ${OrderSaga.order.orderCreated}`);
    const notification = await this.repo.create({
      userId: +data.order.userId,
      orderId: +data.order.id,
    });
    const saved = this.repo.save(notification);

    console.log(`Notify ${OrderSaga.payment.paymentCreated}`);
    await this.rmqService.notify(OrderSaga.payment.paymentCreated, {
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
    console.log(`Catched ${OrderSaga.billing.paymentPayed}`);
    const payment = await this.repo.findOne({
      where: {
        id: +data.payment.id,
      },
    });
    payment.payed = 1;
    const saved = await this.repo.save(payment);

    console.log(`Notify ${OrderSaga.payment.paymentSuccess}`);
    await this.rmqService.notify(OrderSaga.payment.paymentSuccess, {
      ...data,
      payment: saved,
    });
    this.rmqService.ack(msg);
  }

  @RMQRoute(OrderSaga.billing.paymentCompensated, { manualAck: true })
  async billingPaymentCompensatedHandler(
    data: OrderSagaData,
    @RMQMessage msg: ExtendedMessage,
  ): Promise<void> {
    console.log(`Catched ${OrderSaga.billing.paymentCompensated}`);
    const payment = await this.repo.findOne({
      where: {
        id: +data.payment.id,
      },
    });
    payment.payed = 0;
    const saved = await this.repo.save(payment);

    //  console.log(`Notify ${OrderSaga.payment.paymentSuccess}`);
    //  await this.rmqService.notify(OrderSaga.payment.paymentSuccess, {
    //    ...data,
    //    payment: saved,
    //  });
    this.rmqService.ack(msg);
  }

  @RMQRoute(OrderSaga.billing.paymentRejected, { manualAck: true })
  async billingOrderRejectedHandler(
    data: { payment: PaymentPayment; reason: string },
    @RMQMessage msg: ExtendedMessage,
  ): Promise<void> {
    console.log(`Catched ${OrderSaga.billing.paymentRejected}`);
    // ничего не происходит, потому что .payed = 0  по дефолту
    console.log(`Notify ${OrderSaga.payment.paymentFailure}`);
    await this.rmqService.notify(OrderSaga.payment.paymentFailure, data);
    this.rmqService.ack(msg);
  }

  // @RMQRoute(OrderSaga.comensation, { manualAck: true })
  // async orderSagaComensationHandler(
  //   data: OrderSagaData,
  //   @RMQMessage msg: ExtendedMessage,
  // ): Promise<void> {
  //   console.log(`Catched ${OrderSaga.comensation}`);

  //   console.log(`Notify ${OrderSaga.payment.paymentNeedsToCompensate}`);
  //   await this.rmqService.notify(
  //     OrderSaga.payment.paymentNeedsToCompensate,
  //     data,
  //   );
  //   this.rmqService.ack(msg);
  // }
}
