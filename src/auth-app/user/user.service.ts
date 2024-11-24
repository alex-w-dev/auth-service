import { Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { Repository, UpdateResult } from 'typeorm';
import { RMQService } from 'nestjs-rmq';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User) private UserRepo: Repository<User>,
    private readonly rmqService: RMQService,
  ) {}

  async updateHashedRefreshToken(userId: number, hashedRefreshToken: string) {
    return await this.UserRepo.update({ id: userId }, { hashedRefreshToken });
  }

  async createUserInfoMQ(savedUser: User): Promise<void> {
    try {
      await this.rmqService.notify('user-created', savedUser);
    } catch (e) {
      console.log(e, 'createUserInfoMQ ERROR');
    }
  }

  async create(createUserDto: CreateUserDto): Promise<User> {
    const user = await this.UserRepo.create(createUserDto);
    const savedUser = await this.UserRepo.save(user);
    delete savedUser.password;
    delete savedUser.hashedRefreshToken;

    await this.createUserInfoMQ(savedUser);

    return savedUser;
  }

  async findByEmail(email: string) {
    return await this.UserRepo.findOne({
      where: {
        email,
      },
    });
  }

  findAll() {
    return `This action returns all user`;
  }

  async isUserEmailExists(email: string): Promise<boolean> {
    return this.UserRepo.count({
      where: { email },
    }).then((c) => !!c);
  }

  async isUserUsernameExists(username: string): Promise<boolean> {
    return this.UserRepo.count({
      where: { username },
    }).then((c) => !!c);
  }

  async findOne(id: number): Promise<User> {
    return this.UserRepo.findOne({
      where: { id },
      select: [
        'id',
        'username',
        'avatarUrl',
        'email',
        'hashedRefreshToken',
        'role',
      ],
    });
  }

  async update(id: number, updateUserDto: UpdateUserDto): Promise<User> {
    await this.UserRepo.update(id, updateUserDto);

    return this.findOne(id);
  }

  remove(id: number) {
    return `This action removes a #${id} user`;
  }
}
