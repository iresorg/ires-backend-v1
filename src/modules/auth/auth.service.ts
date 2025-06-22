import {
	Injectable,
	UnauthorizedException,
	NotFoundException,
} from "@nestjs/common";
import { UsersService } from "../users/users.service";
import { Utils } from "@/utils/utils";
import type { LoginDto, LoginResponseDto } from "./dto/login";
import type { UserAuthPayload } from "./interfaces/auth";
import { EmailService } from "@/shared/email/service";
import {
	InvalidCredentialsError,
	UserNotFoundError,
} from "@/shared/errors/user.errors";
import { ChangePasswordDto } from "./dto/change-password.dto";
import { AgentsService } from "@agents/agents.service";
import { AgentLoginDto } from "./dto/agent-login.dto";
import { Role } from "@users/enums/role.enum";

@Injectable()
export class AuthService {
	constructor(
		private readonly usersService: UsersService,
		private readonly utils: Utils,
		private readonly emailService: EmailService,
		private readonly agentsService: AgentsService,
	) {}

	async login(body: LoginDto): Promise<LoginResponseDto> {
		const user = await this.usersService.findOne({ email: body.email });
		if (!user) {
			throw new UnauthorizedException("Invalid credentials");
		}

		if (user.status !== "active")
			throw new UnauthorizedException(
				"User deactivated. Please contact admin.",
			);

		const passwordMatch = await this.utils.ensureHashMatchesText(
			user.password,
			body.password,
		);

		if (!passwordMatch)
			throw new UnauthorizedException("Invalid credentials");
		const payload: UserAuthPayload = {
			id: user.id,
			email: user.email,
			role: user.role,
			type: "user",
		};

		const token = this.utils.generateJWT(payload);

		return {
			user: {
				email: user.email,
				firstName: user.firstName,
				lastName: user.lastName,
				role: user.role,
				id: user.id,
				avatar: user.avatar,
				status: user.status,
			},
			accessToken: token,
		};
	}

	async changePassword(
		body: ChangePasswordDto,
		userId: string,
	): Promise<void> {
		const user = await this.usersService.findOne({ id: userId });
		if (!user) {
			throw new UserNotFoundError("User not found");
		}

		const oldPasswordMatch = await this.utils.ensureHashMatchesText(
			user.password,
			body.oldPassword,
		);

		if (!oldPasswordMatch) {
			throw new InvalidCredentialsError();
		}

		const passwordMatch = await this.utils.ensureHashMatchesText(
			user.password,
			body.newPassword,
		);

		if (passwordMatch) {
			throw new InvalidCredentialsError(
				"New password cannot be the same as the old password",
			);
		}

		const newPasswordHash = await this.utils.createHash(body.newPassword);
		await this.usersService.update(userId, { password: newPasswordHash });
	}

	async agentLogin(body: AgentLoginDto) {
		try {
			const agent = await this.agentsService.findOne(body.agentId);

			// Check if agent is active
			if (!agent.isActive) {
				throw new UnauthorizedException(
					"Agent is not active. Please contact administrator.",
				);
			}

			// Validate the token
			const isValidToken = await this.agentsService.validateToken(
				body.agentId,
				body.token,
			);
			if (!isValidToken) {
				throw new UnauthorizedException(
					"Invalid or expired token. Please request a new token from administrator.",
				);
			}

			// Generate JWT token for the agent
			const payload = {
				id: agent.agentId,
				agentId: agent.agentId,
				role: Role.AGENT,
			};

			const accessToken = this.utils.generateJWT(payload);

			return {
				agentId: agent.agentId,
				isActive: agent.isActive,
				accessToken,
			};
		} catch (error) {
			if (error instanceof UnauthorizedException) {
				throw error; // Re-throw auth-related errors
			}
			if (error instanceof NotFoundException) {
				throw new UnauthorizedException("Invalid agent ID or token.");
			}
			throw new UnauthorizedException(
				"Authentication failed. Please try again.",
			);
		}
	}
}
