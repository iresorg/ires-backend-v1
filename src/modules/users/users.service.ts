import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { IUser, IUserCreate, IUserUpdate } from './interfaces/user.interface';
import { UserAlreadyExistsError, UserNotFoundError } from '@/shared/errors';
import { IUserRepository } from './interfaces/user-repo.interface';
import constants from './constants/constants';

@Injectable()
export class UsersService {
  constructor(
    @Inject(constants.USER_REPOSITORY) private usersRepository: IUserRepository,
  ) {}

  async findAll(): Promise<IUser[]> {
    const users = await this.usersRepository.findAll();
    return users;
  }

  async findOne(filter: { id?: string; email?: string }): Promise<IUser | null> {
    if (filter.id) {
      return this.usersRepository.findById(filter.id);
    }
    if (filter.email) {
      return this.usersRepository.findByEmail(filter.email);
    }
  }

  async update(
    id: string,
    updateUserDto: IUserUpdate
  ): Promise<IUser | null> {
    const user = await this.usersRepository.findById(id);
    if (!user) throw new NotFoundException('User not found.');
    try {
      const updatedUser = await this.usersRepository.update(id, updateUserDto);
      return updatedUser;
    } catch (error) {
      if (error instanceof UserNotFoundError) {
        throw new NotFoundException('User not found.');
      }
      throw error;
    }
  }

  async create(createUserDto: IUserCreate): Promise<IUser> {
    try {
      const { email, firstName, lastName, password, role } = createUserDto;
      const user = await this.usersRepository.create({
        email,
        firstName,
        lastName,
        password,
        role,
      });

      return user;
    } catch (error) {
      if (error instanceof UserAlreadyExistsError) {
        throw new ConflictException(
          'User with this email already exists. Please check and try again later.'
        );
      }

      throw error;
    }
  }
}
