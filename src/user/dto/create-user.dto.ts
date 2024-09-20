import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, IsUrl } from 'class-validator';

export class CreateUserDto {
  @ApiProperty()
  @IsString()
  username: string;

  @ApiProperty()
  @IsString()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  password: string;

  @ApiProperty({
    required: false,
  })
  @IsString()
  @IsUrl()
  @IsOptional()
  avatarUrl?: string;
}
