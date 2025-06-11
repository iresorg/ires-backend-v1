import {
	Body,
	Controller,
	HttpCode,
	HttpStatus,
	Post,
	UseGuards,
} from "@nestjs/common";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login";
import { CreateUserDto } from "./dto/create-user";
import { AuthGuard } from "@/shared/guards/auth.guard";
import { Public } from "@/shared/decorators/public.decorator";
import { RoleGuard } from "@/shared/guards/roles.guard";
import { Roles } from "@/shared/decorators/role.decorator";
import { Role } from "../users/enums/role.enum";

@UseGuards(AuthGuard)
@Controller("auth")
export class AuthController {
	constructor(private readonly authService: AuthService) {}

	@Public()
	@HttpCode(HttpStatus.OK)
	@Post("login")
	async login(@Body() body: LoginDto) {
		const data = await this.authService.login(body);

		return {
			message: "Login successful",
			data,
		};
	}

	@UseGuards(RoleGuard)
	@Roles(Role.SUPER_ADMIN)
	@HttpCode(HttpStatus.CREATED)
	@Post("signup")
	async signUpUser(@Body() body: CreateUserDto) {
		await this.authService.signUpUser(body);

		return {
			message: "User created successfully",
		};
	}
}
