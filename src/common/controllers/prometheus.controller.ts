import { PrometheusController } from '@willsoto/nestjs-prometheus';
import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import { Public } from '../decorators/public.decorator';

@Controller('metrics')
export class MyPrometheusContriller extends PrometheusController {
  @Public()
  @Get('')
  index(@Res({ passthrough: true }) response: Response) {
    return super.index(response);
  }
}
