import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional, IsString, IsUrl } from 'class-validator';
import { Role } from '../../../common/modules/auth/enums/role.enum';

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

  @ApiProperty({
    required: false,
  })
  @IsString()
  @IsEnum(Role)
  @IsOptional()
  role?: Role;
}
