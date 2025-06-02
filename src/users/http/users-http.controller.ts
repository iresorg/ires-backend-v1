import { Controller, Get, Param, Post, Body } from '@nestjs/common';
import { UsersHttpService } from './users-http.service';
import { User } from '../entities/user.entity';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CreateUserDto } from './dto/create-user.dto';
import { UserResponseDto } from './dto/user-response.dto';

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
  @ApiResponse({
    status: 200,
    description: 'Return all users',
    type: [UserResponseDto],
  })
  async findAll(): Promise<UserResponseDto[]> {
    return this.usersHttpService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by id' })
  @ApiResponse({
    status: 200,
    description: 'Return user by id',
    type: UserResponseDto,
  })
  async findOne(@Param('id') id: string): Promise<UserResponseDto> {
    return this.usersHttpService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create new user' })
  @ApiResponse({
    status: 201,
    description: 'User created successfully',
    type: UserResponseDto,
  })
  async create(@Body() createUserDto: CreateUserDto): Promise<UserResponseDto> {
    return this.usersHttpService.create(createUserDto);
  }
}
