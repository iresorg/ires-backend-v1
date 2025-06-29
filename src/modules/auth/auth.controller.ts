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
import { AgentLoginDto } from "./dto/agent-login.dto";
import { ResponderLoginDto } from "./dto/responder-login.dto";
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
	@Post("agent-login")
	@ApiOperation({ summary: "Agent login" })
	@ApiResponse({
		status: 200,
		description: "Agent login successful",
	})
	async agentLogin(@Body() body: AgentLoginDto) {
		const data = await this.authService.agentLogin(body);

		return {
			message: "Agent login successful",
			data,
		};
	}

	@Public()
	@HttpCode(HttpStatus.OK)
	@Post("responder-login")
	@ApiOperation({ summary: "Responder login" })
	@ApiResponse({
		status: 200,
		description: "Responder login successful",
	})
	async responderLogin(@Body() body: ResponderLoginDto) {
		const data = await this.authService.responderLogin(body);

		return {
			message: "Responder login successful",
			data,
		};
	}

	@HttpCode(HttpStatus.OK)
	@Post("change-password")
	@ApiOperation({ summary: "Change user password" })
	@ApiResponse({
		status: 200,
		description: "Password changed successfully",
	})
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
