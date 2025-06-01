import { Module } from '@nestjs/common';
import { UsersModule } from '../users.module';
import { UsersHttpController } from '@users/http/users-http.controller';
import { UsersHttpService } from '@users/http/users-http.service';

@Module({
  imports: [UsersModule],
  controllers: [UsersHttpController],
  providers: [UsersHttpService],
  exports: [UsersHttpService],
})
export class UsersHttpModule {}
