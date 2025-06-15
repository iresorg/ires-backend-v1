import { Injectable, UnauthorizedException } from "@nestjs/common";
import { UsersService } from "../users/users.service";
import { Utils } from "@/utils/utils";
import type { LoginDto, LoginResponseDto } from "./dto/login";
import type { AuthPayload } from "./interfaces/auth";
import { EmailService } from "@/shared/email/service";
import {
	InvalidCredentialsError,
	UserNotFoundError,
} from "@/shared/errors/user.errors";
import { ChangePasswordDto } from "./dto/change-password.dto";

@Injectable()
export class AuthService {
	constructor(
		private readonly usersService: UsersService,
		private readonly utils: Utils,
		private readonly emailService: EmailService,
	) {}

	async login(body: LoginDto): Promise<LoginResponseDto> {
		const user = await this.usersService.findOne({ email: body.email });
		if (!user) {
			throw new UnauthorizedException("Invalid credentials");
		}

		const passwordMatch = await this.utils.ensureHashMatchesText(
			user.password,
			body.password,
		);

		if (!passwordMatch)
			throw new UnauthorizedException("Invalid credentials");
		const payload: AuthPayload = {
			id: user.id,
			email: user.email,
			role: user.role,
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
}
