import { Body, Controller, Get, Post } from '@nestjs/common';
import { ExtendedMessage, RMQMessage, RMQRoute, RMQService } from 'nestjs-rmq';
import { BillingUser } from './entities/billing-user.entity';
import { DataSource, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { ApiTags } from '@nestjs/swagger';
import { RequestUser } from '../common/decorators/request-user.decorator';
import { User } from '../auth-app/entities/user.entity';
import { TopUpBillDto } from './dto/top-up-bill.dto';
import { OrderOrder } from '../order-app/entities/order.entity';
import { OrderSaga, OrderSagaData } from '../common/sagas/order.saga';
import { BillingTransaction } from './entities/billing-transaction.entity';

@ApiTags('billing')
@Controller('billing')
export class BillingAppController {
  constructor(
    private readonly rmqService: RMQService,
    @InjectRepository(BillingUser)
    private BillingUserRepo: Repository<BillingUser>,
    @InjectRepository(BillingTransaction)
    private BillingTransactionRepo: Repository<BillingTransaction>,
    private dataSource: DataSource,
  ) {}

  @Get('/user')
  async getUserGold(@RequestUser() requestUser: User): Promise<BillingUser> {
    const user = await this.BillingUserRepo.findOne({
      where: {
        userId: +requestUser.id,
      },
    });
    return user;
  }

  @Post('/user/top-up-bill')
  async topUpUserBalance(
    @Body() body: TopUpBillDto,
    @RequestUser() requestUser: User,
  ): Promise<BillingUser> {
    const result = await this.BillingUserRepo.createQueryBuilder()
      .update(BillingUser)
      .where({
        userId: requestUser.id,
      })
      .set({ bill: () => 'bill + :x' })
      .setParameter('x', body.bill)
      .execute();

    return this.BillingUserRepo.findOne({
      where: {
        userId: requestUser.id,
      },
    });
  }

  @RMQRoute('user-created', { manualAck: true })
  async info(
    data: Record<string, string>,
    @RMQMessage msg: ExtendedMessage,
  ): Promise<void> {
    const user = this.BillingUserRepo.create({
      bill: 0,
      userId: +data.id,
    });
    await this.BillingUserRepo.save(user);
    this.rmqService.ack(msg);
  }

  @RMQRoute(OrderSaga.payment.paymentCreated, { manualAck: true })
  async orderNeedsToPayHandler(
    data: OrderSagaData,
    @RMQMessage msg: ExtendedMessage,
  ): Promise<void> {
    console.log(`Catched ${OrderSaga.payment.paymentCreated}`);
    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction('READ COMMITTED');

    let error: string;

    try {
      const user = await this.BillingUserRepo.findOne({
        where: {
          userId: +data.order.userId,
        },
      });
      const cost = +data.order.cost;

      if (cost < 0) {
        throw new Error('cost must be positive');
      }

      if (user.bill >= cost) {
        user.bill -= cost;
      } else {
        throw new Error('not enough money');
      }

      await queryRunner.manager.save(user);

      const transaction = this.BillingTransactionRepo.create({
        payedCost: cost,
        orderId: data.order.id,
      });
      await queryRunner.manager.save(transaction);

      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      error = err.toString();
      console.error(error);
    } finally {
      await queryRunner.release();
      this.notifyPaymentPaying(data, error);
    }
    this.rmqService.ack(msg);
  }

  async notifyPaymentPaying(data: OrderSagaData, error?: string) {
    try {
      if (error) {
        console.log(`Notify ${OrderSaga.billing.paymentRejected}`);
        await this.rmqService.notify(OrderSaga.billing.paymentRejected, {
          ...data,
          billing: {
            success: false,
            errorReason: error,
          },
        } as OrderSagaData);
      } else {
        console.log(`Notify ${OrderSaga.billing.paymentPayed}`);
        await this.rmqService.notify(OrderSaga.billing.paymentPayed, {
          ...data,
          billing: {
            success: true,
          },
        });
      }
    } catch (e) {
      console.error('Error notifyOrderPaying', data, error);
      console.error(e);
    }
  }
  async notifyPaymentCompensated(data: OrderSagaData) {
    try {
      console.log(`Notify ${OrderSaga.billing.paymentCompensated}`);
      await this.rmqService.notify(OrderSaga.billing.paymentCompensated, {
        ...data,
        billingCompensated: true,
      } as OrderSagaData);
    } catch (e) {
      console.error('Error notifyPaymentCompensated', data);
      console.error(e);
    }
  }

  @RMQRoute(OrderSaga.compensation, { manualAck: true })
  async billingPaymentCompensatedHandler(
    data: OrderSagaData,
    @RMQMessage msg: ExtendedMessage,
  ): Promise<void> {
    console.log(`Catched ${OrderSaga.compensation}`);
    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction('READ COMMITTED');

    try {
      const user = await this.BillingUserRepo.findOne({
        where: {
          userId: +data.order.userId,
        },
      });
      const transaction = await this.BillingTransactionRepo.findOne({
        where: { orderId: data.order.id },
      });

      if (!transaction.compensated) {
        transaction.compensated = 1;
        user.bill += transaction.payedCost;
      } else {
        throw new Error('already compensated');
      }

      await queryRunner.manager.save(user);
      await queryRunner.manager.save(transaction);

      await queryRunner.commitTransaction();
      this.notifyPaymentCompensated(data);
    } catch (err) {
      await queryRunner.rollbackTransaction();
    } finally {
      await queryRunner.release();
    }
    this.rmqService.ack(msg);
  }
}
