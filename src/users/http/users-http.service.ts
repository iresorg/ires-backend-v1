import { Injectable } from '@nestjs/common';
import { UsersService } from '../users.service';
import { User } from '../entities/user.entity';

@Injectable()
export class UsersHttpService {
  constructor(private readonly usersService: UsersService) {}

  async findAll(): Promise<User[]> {
    return await this.usersService.findAll();
  }

  async findOne(id: string): Promise<User> {
    return await this.usersService.findOne(id);
  }
}
