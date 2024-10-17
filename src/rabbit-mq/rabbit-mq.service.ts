import { Global, Injectable } from '@nestjs/common';
import { RMQService } from 'nestjs-rmq';

@Injectable()
@Global()
export class RabbitMqService {
  constructor(private readonly rmqService: RMQService) {
    setTimeout(() => this.sendTestEmail(), 1000);
  }

  async sendTestEmail(): Promise<void> {
    try {
      await this.rmqService.notify('mail-request', {
        to: ['test-email'],
        subject: 'You are the best',
        html: 'please contact again',
      });
    } catch (e) {
      console.log(e, 'e');
    }
  }
}
