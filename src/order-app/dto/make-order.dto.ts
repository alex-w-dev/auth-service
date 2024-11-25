import { ApiProperty } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';

export class MakeOrderDto {
  @ApiProperty({
    type: Number,
  })
  @IsNumber()
  cost: number;
}
