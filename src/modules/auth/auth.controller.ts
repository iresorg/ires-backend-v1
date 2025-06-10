import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login';
import { CreateUserDto } from './dto/create-user';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @HttpCode(HttpStatus.OK)
  @Post("login")
  async login(@Body() body: LoginDto) {
    const data = await this.authService.login(body);

    return {
      message: "Login successful",
      data
    }
  }

  @HttpCode(HttpStatus.CREATED)
  @Post("signup")
  async signUpUser(@Body() body: CreateUserDto) {
    await this.authService.signUpUser(body);

    return {
      message: "User created successfully",
    }
  }
}
