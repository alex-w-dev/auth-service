import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Role } from 'src/auth/enums/role.enum';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Public } from 'src/auth/decorators/public.decorator';
import { User } from 'src/entities/user.entity';
import { RequestUser } from 'src/decorators/request-user.decorator';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiBearerAuth()
@ApiTags('user')
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Roles(Role.EDITOR, Role.ADMIN)
  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  @Public()
  @Post('register')
  async register(@Body() createUserDto: CreateUserDto): Promise<User> {
    if (await this.userService.isUserEmailExists(createUserDto.email)) {
      throw new BadRequestException('User with passed email already exist');
    }
    if (await this.userService.isUserUsernameExists(createUserDto.username)) {
      throw new BadRequestException('User with passed username already exist');
    }

    return this.userService.create(createUserDto);
  }

  @Get('profile')
  getProfile(@Req() req) {
    return this.userService.findOne(req.user.id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @RequestUser() user: User,
  ) {
    if (user.id !== +id) {
      throw new ForbiddenException('You can update only your profile');
    }

    return this.userService.update(+id, updateUserDto);
  }

  @Roles(Role.ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.userService.remove(+id);
  }
}
