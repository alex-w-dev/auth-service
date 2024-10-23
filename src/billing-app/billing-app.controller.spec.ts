import { Test, TestingModule } from '@nestjs/testing';
import { BillingAppController } from './billing-app.controller';

describe('BillingAppController', () => {
  let controller: BillingAppController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BillingAppController],
    }).compile();

    controller = module.get<BillingAppController>(BillingAppController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
