import { Controller, Get, Param } from '@nestjs/common';
import { ExtendedMessage, RMQMessage, RMQRoute, RMQService } from 'nestjs-rmq';
import { BillingUser } from './entities/user.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { ApiParam, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { RequestUser } from '../common/decorators/request-user.decorator';
import { User } from '../auth-app/entities/user.entity';

@ApiTags('billing')
@Controller('billing')
export class BillingAppController {
  constructor(
    private readonly rmqService: RMQService,
    @InjectRepository(BillingUser)
    private BillingUserRepo: Repository<BillingUser>,
  ) {}

  // @Public()
  @Get('/user')
  async getUserGold(@RequestUser() requestUser: User): Promise<BillingUser> {
    console.log('user', requestUser);
    const user = await this.BillingUserRepo.findOne({
      where: {
        userId: +requestUser.id,
      },
    });
    return user;
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
    console.log('data of user-created');
    console.log(data);
  }
}
