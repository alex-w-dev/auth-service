import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsObject } from 'class-validator';

export class MakeOrderDto {
  @ApiProperty({
    type: Number,
  })
  @IsNumber()
  cost: number;

  @ApiProperty()
  @IsObject()
  data: {
    products: Array<{
      productId: string;
      count: number;
      cost: number;
    }>;
    courierTime: number;
  };
}
