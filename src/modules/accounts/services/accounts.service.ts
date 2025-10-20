import {
	BadRequestException,
	ConflictException,
	Injectable,
	UnauthorizedException,
} from "@nestjs/common";
import { AccountsRepository } from "../repository/accounts.repository";
import { Utils } from "@/utils/utils";
import { EmailService } from "@/shared/email/service";
import { FileUploadService } from "../../file-upload/service";
import { RegisterIndividualDto } from "../dto/register-individual.dto";
import { RegisterOrganizationDto } from "../dto/register-organization.dto";
import { LoginDto } from "../dto/login.dto";
import { ForgotPasswordDto } from "../dto/forgot-password.dto";
import { ResetPasswordDto } from "../dto/reset-password.dto";

@Injectable()
export class AccountsService {
	constructor(
		private readonly repo: AccountsRepository,
		private readonly utils: Utils,
		private readonly emailService: EmailService,
		private readonly fileUpload: FileUploadService,
	) {}

	async registerIndividual(
		dto: RegisterIndividualDto,
		profilePicture?: Express.Multer.File,
	) {
		const existing = await this.repo.findByEmail(dto.email);
		if (existing)
			throw new ConflictException(
				"Account with this email already exists",
			);

		const passwordHash = await this.utils.createHash(dto.password);
		const account = await this.repo.createAccount({
			email: dto.email,
			passwordHash,
			role: "individual",
			status: "active",
		});

		let profilePictureData = null;
		if (profilePicture) {
			const response = await this.fileUpload.uploadImage(profilePicture);
			profilePictureData = {
				publicId: response.public_id,
				url: response.secure_url,
			};
		}

		await this.repo.createIndividualProfile({
			account: account,
			firstName: dto.firstName,
			lastName: dto.lastName,
			phoneNumber: dto.phoneNumber,
			profilePicture: profilePictureData,
		});

		await this.sendEmailVerification(account.id, account.email);
		return { id: account.id, email: account.email, role: account.role };
	}

	async registerOrganization(
		dto: RegisterOrganizationDto,
		logoFile?: Express.Multer.File,
	) {
		const existing = await this.repo.findByEmail(dto.email);
		if (existing)
			throw new ConflictException(
				"Account with this email already exists",
			);

		const passwordHash = await this.utils.createHash(dto.password);
		const account = await this.repo.createAccount({
			email: dto.email,
			passwordHash,
			role: "organization",
			status: "active",
		});

		let logoData = null;
		if (logoFile) {
			const response = await this.fileUpload.uploadImage(logoFile);
			logoData = {
				publicId: response.public_id,
				url: response.secure_url,
			};
		}

		await this.repo.createOrganizationProfile({
			account: account,
			organizationName: dto.organizationName,
			logoUrl: logoData,
			industryType: dto.industryType,
			companySize: dto.companySize,
			businessAddress: dto.businessAddress,
			city: dto.city,
			state: dto.state,
			country: dto.country,
			phoneNumber: dto.phoneNumber,
			primaryContactFirstName: dto.primaryContactFirstName,
			primaryContactLastName: dto.primaryContactLastName,
			primaryContactJobTitle: dto.primaryContactJobTitle,
			primaryContactEmail: dto.primaryContactEmail,
			primaryContactPhoneNumber: dto.primaryContactPhoneNumber,
		});

		await this.sendEmailVerification(account.id, account.email);
		return { id: account.id, email: account.email, role: account.role };
	}

	async login(dto: LoginDto) {
		const account = await this.repo.findByEmail(dto.email);
		if (!account) throw new UnauthorizedException("Invalid credentials");

		const ok = await this.utils.ensureHashMatchesText(
			account.passwordHash,
			dto.password,
		);
		if (!ok) throw new UnauthorizedException("Invalid credentials");

		await this.repo.updateLastLogin(account.id, new Date());

		const token = this.utils.generateJWT({
			id: account.id,
			email: account.email,
			role: account.role,
			aud: "portal",
		});
		return { token };
	}

	private generateOtp(length: number = 6) {
		const digits = "0123456789";
		let code = "";
		for (let i = 0; i < length; i++)
			code += digits[Math.floor(Math.random() * digits.length)];
		return code;
	}

	async sendEmailVerification(accountId: string, email: string) {
		const otp = this.generateOtp(6);
		const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
		await this.repo.createEmailVerification({
			account: { id: accountId } as any,
			email,
			otp,
			expiresAt,
		});
		await this.emailService.sendAccountVerificationEmail(email, otp);
	}

	async getProfile(accountId: string) {
		const account = await this.repo.findById(accountId);
		if (!account) {
			throw new BadRequestException("Account not found");
		}

		// Return basic account info
		const profile: any = {
			id: account.id,
			email: account.email,
			role: account.role,
			emailVerifiedAt: account.emailVerifiedAt,
			lastLoginAt: account.lastLogin,
			createdAt: account.createdAt,
		};

		// Add individual profile if exists
		if (account.individualProfile) {
			profile.individualProfile = {
				firstName: account.individualProfile.firstName,
				lastName: account.individualProfile.lastName,
				phoneNumber: account.individualProfile.phoneNumber,
				profilePicture: account.individualProfile.profilePicture,
			};
		}

		// Add organization profile if exists
		if (account.organizationProfile) {
			profile.organizationProfile = {
				organizationName: account.organizationProfile.organizationName,
				logoUrl: account.organizationProfile.logoUrl,
				industryType: account.organizationProfile.industryType,
				companySize: account.organizationProfile.companySize,
				businessAddress: account.organizationProfile.businessAddress,
				city: account.organizationProfile.city,
				state: account.organizationProfile.state,
				country: account.organizationProfile.country,
				phoneNumber: account.organizationProfile.phoneNumber,
				primaryContactFirstName:
					account.organizationProfile.primaryContactFirstName,
				primaryContactLastName:
					account.organizationProfile.primaryContactLastName,
				primaryContactJobTitle:
					account.organizationProfile.primaryContactJobTitle,
				primaryContactEmail:
					account.organizationProfile.primaryContactEmail,
				primaryContactPhoneNumber:
					account.organizationProfile.primaryContactPhoneNumber,
			};
		}

		return profile;
	}

	async verifyEmail(accountId: string, email: string, otp: string) {
		const rec = await this.repo.findValidEmailVerification(
			accountId,
			email,
			otp,
		);
		if (!rec || rec.expiresAt < new Date())
			throw new BadRequestException("Invalid or expired OTP");
		await this.repo.markEmailVerificationUsed(rec.id);
		const account = await this.repo.findById(accountId);
		if (!account) throw new BadRequestException("Account not found");
		account.emailVerifiedAt = new Date();
		await this.repo.createAccount(account);

		// Send account welcome email after successful verification
		let userName = "";
		let accountType: "individual" | "organization" = "individual";
		if (account.role === "individual" && account.individualProfile) {
			userName = `${account.individualProfile.firstName} ${account.individualProfile.lastName}`;
			accountType = "individual";
		} else if (
			account.role === "organization" &&
			account.organizationProfile
		) {
			userName = account.organizationProfile.organizationName;
			accountType = "organization";
		} else {
			userName = email; // Fallback to email if no profile found
		}

		await this.emailService.sendAccountWelcomeEmail(
			email,
			userName,
			accountType,
		);

		return { verified: true };
	}

	private generateResetToken(length: number = 32) {
		const chars =
			"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
		let token = "";
		for (let i = 0; i < length; i++)
			token += chars[Math.floor(Math.random() * chars.length)];
		return token;
	}

	async forgotPassword(dto: ForgotPasswordDto) {
		const account = await this.repo.findByEmail(dto.email);
		if (!account) {
			// Don't reveal if email exists or not for security
			return {
				message:
					"If the email exists, a password reset link has been sent",
			};
		}

		const resetToken = this.generateResetToken(32);
		const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

		await this.repo.createPasswordReset({
			account: account,
			email: dto.email,
			token: resetToken,
			expiresAt,
		});

		await this.emailService.sendPasswordResetEmail(dto.email, resetToken);

		return {
			message: "If the email exists, a password reset link has been sent",
		};
	}

	async resetPassword(dto: ResetPasswordDto) {
		const resetRecord = await this.repo.findValidPasswordReset(
			dto.email,
			dto.token,
		);
		if (!resetRecord || resetRecord.expiresAt < new Date()) {
			throw new BadRequestException("Invalid or expired reset token");
		}

		const account = await this.repo.findByEmail(dto.email);
		if (!account) {
			throw new BadRequestException("Account not found");
		}

		const passwordHash = await this.utils.createHash(dto.newPassword);
		await this.repo.updatePassword(account.id, passwordHash);
		await this.repo.markPasswordResetUsed(resetRecord.id);

		return { message: "Password has been reset successfully" };
	}
}
