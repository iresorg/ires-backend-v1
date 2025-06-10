import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { UserRepository } from './users.repository';
import constants from './constants/constants';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [UsersController],
  providers: [
    {
      provide: constants.USER_REPOSITORY,
      useClass: UserRepository,
    },
    UsersService,
  ],
  exports: [UsersService],
})
export class UsersModule {}
