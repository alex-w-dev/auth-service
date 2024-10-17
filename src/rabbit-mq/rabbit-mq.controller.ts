import { Controller } from '@nestjs/common';
import { ExtendedMessage, RMQMessage, RMQRoute, RMQService } from 'nestjs-rmq';

@Controller()
export class RabbitMqController {
  constructor(private readonly rmqService: RMQService) {}
  @RMQRoute('user-created', { manualAck: true })
  async info(
    data: Record<string, string>,
    @RMQMessage msg: ExtendedMessage,
  ): Promise<void> {
    console.log('data of user-created');
    console.log(data);
    this.rmqService.ack(msg);
  }
}
