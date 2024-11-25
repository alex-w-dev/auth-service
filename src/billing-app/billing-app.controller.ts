import { Body, Controller, Get, Post } from '@nestjs/common';
import { ExtendedMessage, RMQMessage, RMQRoute, RMQService } from 'nestjs-rmq';
import { BillingUser } from './entities/user.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { ApiTags } from '@nestjs/swagger';
import { RequestUser } from '../common/decorators/request-user.decorator';
import { User } from '../auth-app/entities/user.entity';
import { TopUpBillDto } from './dto/top-up-bill.dto';

@ApiTags('billing')
@Controller('billing')
export class BillingAppController {
  constructor(
    private readonly rmqService: RMQService,
    @InjectRepository(BillingUser)
    private BillingUserRepo: Repository<BillingUser>,
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
}
