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
import { ForgotPasswordDto } from "./dto/forgot-password.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { AuthRequest } from "@/shared/interfaces/request.interface";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";

@ApiTags("Auth")
@UseGuards(AuthGuard)
@Controller("auth")
export class AuthController {
	constructor(private readonly authService: AuthService) {}

	@Public()
	@HttpCode(HttpStatus.OK)
	@Post("login")
	@ApiOperation({ summary: "User login" })
	@ApiResponse({
		status: 200,
		description: "Login successful",
	})
	async login(@Body() body: LoginDto) {
		const data = await this.authService.login(body);

		return {
			message: "Login successful",
			data,
		};
	}

	@Public()
	@HttpCode(HttpStatus.OK)
	@Post("forgot-password")
	@ApiOperation({
		summary: "Request a staff password reset",
		description:
			"Sends a reset link to an active admin, agent, or responder. Deactivated users are rejected. Unknown emails get the same success message as a real account.",
	})
	@ApiResponse({ status: 200, description: "Reset email accepted" })
	@ApiResponse({
		status: 401,
		description: "User deactivated. Please contact admin.",
	})
	async forgotPassword(@Body() body: ForgotPasswordDto) {
		return await this.authService.forgotPassword(body);
	}

	@Public()
	@HttpCode(HttpStatus.OK)
	@Post("reset-password")
	@ApiOperation({
		summary: "Reset a staff password",
		description:
			"Sets a new password using the token from the reset email. The token expires in 1 hour. Deactivated users cannot reset. Existing sessions are signed out.",
	})
	@ApiResponse({ status: 200, description: "Password reset successfully" })
	@ApiResponse({
		status: 400,
		description: "Invalid or expired reset token",
	})
	@ApiResponse({
		status: 401,
		description: "User deactivated. Please contact admin.",
	})
	async resetPassword(@Body() body: ResetPasswordDto) {
		return await this.authService.resetPassword(body);
	}

	@HttpCode(HttpStatus.OK)
	@Post("change-password")
	@ApiOperation({
		summary: "Change password",
		description:
			"Any signed-in staff user (super admin, admin, agent admin, agent, responder admin, responder) can replace their password. The current password is the temporary one from the welcome email on first login. Returns a new access token because the previous token is revoked.",
	})
	@ApiResponse({
		status: 200,
		description: "Password changed successfully",
	})
	async changePassword(
		@Body() body: ChangePasswordDto,
		@Req() req: AuthRequest,
	) {
		const result = await this.authService.changePassword(body, req.user.id);

		return {
			message: "Password changed successfully",
			mustChangePassword: result.mustChangePassword,
			accessToken: result.accessToken,
		};
	}

	@HttpCode(HttpStatus.OK)
	@Post("logout")
	@ApiOperation({
		summary: "Logout",
		description:
			"Ends every active staff session. Previously issued JWTs are rejected.",
	})
	@ApiResponse({
		status: 200,
		description: "Logged out successfully",
	})
	async logout(@Req() req: AuthRequest) {
		await this.authService.logout(req.user.id);
		return { message: "Logged out successfully" };
	}
}
