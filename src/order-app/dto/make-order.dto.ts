import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsObject, IsOptional } from 'class-validator';

export class MakeOrderDto {
  @ApiProperty({
    type: Number,
  })
  @IsNumber()
  cost: number;

  @ApiProperty({
    type: Boolean,
  })
  @IsOptional()
  @IsBoolean()
  doubleAccepted?: boolean;

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
