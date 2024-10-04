import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { ConfigService } from '@nestjs/config';
import { Public } from './auth/decorators/public.decorator';

@Controller({
  path: '',
})
export class AppController {
  constructor(
    private readonly appService: AppService,
    private configService: ConfigService,
  ) {}

  @Public()
  @Get('health')
  health(): Record<string, string> {
    return {
      status: 'OK',
      hostname: process.env.HOSTNAME,
    };
  }

  @Get()
  getHello(): string {
    return this.configService.get('dbconfig.dev.type');
  }
}
