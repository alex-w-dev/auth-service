import { Body, Controller, Get, Post } from '@nestjs/common';
import { ExtendedMessage, RMQMessage, RMQRoute, RMQService } from 'nestjs-rmq';
import { BillingUser } from './entities/user.entity';
import { DataSource, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { ApiTags } from '@nestjs/swagger';
import { RequestUser } from '../common/decorators/request-user.decorator';
import { User } from '../auth-app/entities/user.entity';
import { TopUpBillDto } from './dto/top-up-bill.dto';
import { OrderOrder } from '../order-app/entities/order.entity';

@ApiTags('billing')
@Controller('billing')
export class BillingAppController {
  constructor(
    private readonly rmqService: RMQService,
    @InjectRepository(BillingUser)
    private BillingUserRepo: Repository<BillingUser>,
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

  @RMQRoute('order-needs-to-pay', { manualAck: true })
  async orderNeedsToPayHandler(
    data: OrderOrder,
    @RMQMessage msg: ExtendedMessage,
  ): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction('READ COMMITTED');

    let error: string;

    try {
      const user = await this.BillingUserRepo.findOne({
        where: {
          userId: +data.userId,
        },
      });
      const cost = +data.cost;

      if (cost < 0) {
        throw new Error('cost must be positive');
      }

      if (user.bill >= cost) {
        user.bill -= cost;
      } else {
        throw new Error('not enough money');
      }

      await queryRunner.manager.save(user);
      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      error = err.toString();
    } finally {
      await queryRunner.release();
      this.notifyOrderPaying(data, error);
    }
    this.rmqService.ack(msg);
  }

  async notifyOrderPaying(order: OrderOrder, error?: string) {
    console.log(error, order);
    try {
      if (error) {
        await this.rmqService.notify('billing-order-rejected', {
          order: order,
          reason: error,
        });
      } else {
        await this.rmqService.notify('billing-order-payed', {
          order: order,
        });
      }
    } catch (e) {
      console.error('Error notifyOrderPaying', order, error);
      console.error(e);
    }
  }
}
