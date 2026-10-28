import { randomBytes } from "crypto";
import {
	Injectable,
	UnauthorizedException,
	BadRequestException,
	InternalServerErrorException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
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
import { ForgotPasswordDto } from "./dto/forgot-password.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { UserPasswordReset } from "./entities/user-password-reset.entity";
import { User } from "../users/entities/user.entity";

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;
const DEACTIVATED_MESSAGE = "User deactivated. Please contact admin.";

@Injectable()
export class AuthService {
	constructor(
		private readonly usersService: UsersService,
		private readonly utils: Utils,
		private readonly emailService: EmailService,
		@InjectRepository(UserPasswordReset)
		private readonly passwordResets: Repository<UserPasswordReset>,
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
			tv: user.tokenVersion ?? 0,
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
				mustChangePassword: user.mustChangePassword ?? false,
			},
			accessToken: token,
		};
	}

	async changePassword(body: ChangePasswordDto, userId: string) {
		const user = await this.usersService.findOne({ id: userId });
		if (!user) {
			throw new UserNotFoundError("User not found");
		}

		const currentPassword = body.currentPassword || body.oldPassword;
		if (!currentPassword) {
			throw new BadRequestException("currentPassword is required");
		}

		const oldPasswordMatch = await this.utils.ensureHashMatchesText(
			user.password,
			currentPassword,
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
		await this.usersService.setMustChangePassword(userId, false);
		await this.usersService.incrementTokenVersion(userId);

		const updated = await this.usersService.findOne({ id: userId });
		const accessToken = this.utils.generateJWT({
			id: user.id,
			email: user.email,
			role: user.role,
			type: "user" as const,
			tv: updated?.tokenVersion ?? (user.tokenVersion ?? 0) + 1,
		});

		return {
			mustChangePassword: false,
			accessToken,
		};
	}

	async logout(userId: string) {
		await this.usersService.incrementTokenVersion(userId);
	}

	async forgotPassword(dto: ForgotPasswordDto) {
		const user = await this.usersService.findByEmailInsensitive(dto.email);
		if (!user) {
			return {
				message:
					"If the email exists, a password reset link has been sent",
			};
		}

		if (user.status !== "active") {
			throw new UnauthorizedException(DEACTIVATED_MESSAGE);
		}

		const token = randomBytes(32).toString("hex");
		const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

		await this.passwordResets.update(
			{ email: user.email, used: false },
			{ used: true },
		);
		await this.passwordResets.save(
			this.passwordResets.create({
				user: { id: user.id } as User,
				email: user.email,
				token,
				expiresAt,
				used: false,
			}),
		);

		const base = (
			process.env.FRONTEND_URL ||
			process.env.PUBLIC_FRONTEND_URL ||
			""
		).replace(/\/$/, "");
		if (!base) {
			throw new InternalServerErrorException(
				"Could not send the password reset email.",
			);
		}
		const resetUrl = `${base}/reset-password?token=${token}&email=${encodeURIComponent(user.email)}`;

		try {
			await this.emailService.sendStaffPasswordResetEmail({
				email: user.email,
				resetToken: token,
				resetUrl,
			});
		} catch {
			throw new InternalServerErrorException(
				"Could not send the password reset email.",
			);
		}

		return {
			message: "If the email exists, a password reset link has been sent",
		};
	}

	async resetPassword(dto: ResetPasswordDto) {
		const record = await this.passwordResets.findOne({
			where: { token: dto.token, used: false },
		});
		const emailMatches =
			record?.email.toLowerCase() === dto.email.trim().toLowerCase();
		if (!record || !emailMatches || record.expiresAt < new Date()) {
			throw new BadRequestException("Invalid or expired reset token");
		}

		const user = await this.usersService.findByEmailInsensitive(
			record.email,
		);
		if (!user) {
			throw new BadRequestException("Invalid or expired reset token");
		}
		if (user.status !== "active") {
			throw new UnauthorizedException(DEACTIVATED_MESSAGE);
		}

		const samePassword = await this.utils.ensureHashMatchesText(
			user.password,
			dto.newPassword,
		);
		if (samePassword) {
			throw new BadRequestException(
				"New password cannot be the same as the old password",
			);
		}

		const passwordHash = await this.utils.createHash(dto.newPassword);
		await this.usersService.update(user.id, { password: passwordHash });
		await this.usersService.setMustChangePassword(user.id, false);
		await this.usersService.incrementTokenVersion(user.id);
		await this.passwordResets.update({ id: record.id }, { used: true });

		return { message: "Password has been reset successfully" };
	}
}
