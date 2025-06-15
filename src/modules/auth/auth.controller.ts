import {
	Body,
	Controller,
	HttpCode,
	HttpStatus,
	Post,
	Req,
	UseGuards,
} from "@nestjs/common";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login";
import { AuthGuard } from "@/shared/guards/auth.guard";
import { Public } from "@/shared/decorators/public.decorator";
import { ChangePasswordDto } from "./dto/change-password.dto";
import { AuthRequest } from "@/shared/interfaces/request.interface";

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

	@HttpCode(HttpStatus.OK)
	@Post("change-password")
	async changePassword(
		@Body() body: ChangePasswordDto,
		@Req() req: AuthRequest,
	) {
		await this.authService.changePassword(body, req.user.id);

		return {
			message: "Password changed successfully",
		};
	}
}
