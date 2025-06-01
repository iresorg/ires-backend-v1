import { Controller, Get, Param } from '@nestjs/common';
import { UsersHttpService } from './users-http.service';
import { User } from '../entities/user.entity';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('users')
@Controller('users')
export class UsersHttpController {
  constructor(private readonly usersHttpService: UsersHttpService) {}

  @Get('test')
  @ApiOperation({ summary: 'Test database connection' })
  async testConnection(): Promise<{ message: string; timestamp: Date }> {
    await this.usersHttpService.findAll();
    return {
      message: 'Database connection successful',
      timestamp: new Date(),
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get all users' })
  @ApiResponse({ status: 200, description: 'Return all users', type: [User] })
  async findAll(): Promise<User[]> {
    return this.usersHttpService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by id' })
  @ApiResponse({ status: 200, description: 'Return user by id', type: User })
  async findOne(@Param('id') id: string): Promise<User> {
    return this.usersHttpService.findOne(id);
  }
}
