import {
	Body,
	Controller,
	Get,
	HttpCode,
	HttpStatus,
	Post,
	Req,
	UseGuards,
	UseInterceptors,
	UploadedFile,
} from "@nestjs/common";
import {
	ApiTags,
	ApiOperation,
	ApiResponse,
	ApiBody,
	ApiConsumes,
} from "@nestjs/swagger";
import { FileInterceptor } from "@nestjs/platform-express";
import { AccountsService } from "../services/accounts.service";
import { RegisterIndividualDto } from "../dto/register-individual.dto";
import { RegisterOrganizationDto } from "../dto/register-organization.dto";
import { LoginDto } from "../dto/login.dto";
import { ForgotPasswordDto } from "../dto/forgot-password.dto";
import { ResetPasswordDto } from "../dto/reset-password.dto";
import { VerifyEmailDto } from "../dto/verify-email.dto";
import { Public } from "@/shared/decorators/public.decorator";
import { AccountsAuthGuard } from "@/shared/guards/accounts-auth.guard";

@ApiTags("Account Authentication")
@Controller("accounts/auth")
export class AccountsAuthController {
	constructor(private readonly accountsService: AccountsService) {}

	@Public()
	@Post("register")
	@UseInterceptors(FileInterceptor("profilePicture"))
	@ApiConsumes("multipart/form-data")
	@ApiOperation({
		summary: "Register a new account",
		description:
			"Register a new individual or organization account. Users will receive an email verification OTP after successful registration.",
	})
	@ApiBody({
		description: "Account registration data with optional profile picture",
		schema: {
			type: "object",
			properties: {
				profilePicture: {
					type: "string",
					format: "binary",
					description: "Profile picture file (optional)",
				},
				// Individual fields
				email: { type: "string", example: "john.doe@example.com" },
				password: { type: "string", example: "securePassword123" },
				role: { type: "string", example: "individual" },
				firstName: { type: "string", example: "John" },
				lastName: { type: "string", example: "Doe" },
				phoneNumber: { type: "string", example: "+1234567890" },
				// Organization fields
				organizationName: {
					type: "string",
					example: "Acme Corporation",
				},
				industryType: { type: "string", example: "Technology" },
				companySize: { type: "string", example: "51-200" },
				businessAddress: { type: "string", example: "123 Business St" },
				city: { type: "string", example: "New York" },
				state: { type: "string", example: "NY" },
				country: { type: "string", example: "United States" },
				primaryContactFirstName: { type: "string", example: "Jane" },
				primaryContactLastName: { type: "string", example: "Smith" },
				primaryContactJobTitle: {
					type: "string",
					example: "IT Manager",
				},
				primaryContactEmail: {
					type: "string",
					example: "jane@company.com",
				},
				primaryContactPhoneNumber: {
					type: "string",
					example: "+1234567890",
				},
			},
		},
	})
	@ApiResponse({
		status: 201,
		description: "Account registered successfully",
		schema: {
			type: "object",
			properties: {
				id: { type: "string", example: "uuid-string" },
				email: { type: "string", example: "user@example.com" },
				role: { type: "string", example: "individual" },
			},
		},
	})
	@ApiResponse({
		status: 409,
		description: "Account with this email already exists",
		schema: {
			type: "object",
			properties: {
				message: {
					type: "string",
					example: "Account with this email already exists",
				},
			},
		},
	})
	@ApiResponse({
		status: 400,
		description: "Invalid role or validation error",
	})
	async register(
		@UploadedFile() profilePicture: Express.Multer.File,
		@Body() body: RegisterIndividualDto | RegisterOrganizationDto,
	) {
		if (body.role === "individual") {
			return await this.accountsService.registerIndividual(
				body as RegisterIndividualDto,
				profilePicture,
			);
		}
		if (body.role === "organization") {
			return await this.accountsService.registerOrganization(
				body as RegisterOrganizationDto,
				profilePicture,
			);
		}
		return { message: "Invalid role" };
	}

	@Public()
	@Post("login")
	@HttpCode(HttpStatus.OK)
	@ApiOperation({
		summary: "Login to account",
		description:
			"Authenticate with email and password to receive a JWT token.",
	})
	@ApiBody({
		description: "Login credentials",
		type: LoginDto,
	})
	@ApiResponse({
		status: 200,
		description: "Login successful",
		schema: {
			type: "object",
			properties: {
				token: { type: "string", example: "jwt-token-string" },
			},
		},
	})
	@ApiResponse({
		status: 401,
		description: "Invalid credentials",
		schema: {
			type: "object",
			properties: {
				message: { type: "string", example: "Invalid credentials" },
			},
		},
	})
	async login(@Body() body: LoginDto) {
		return await this.accountsService.login(body);
	}

	@UseGuards(AccountsAuthGuard)
	@Get("me")
	@ApiOperation({
		summary: "Get current user profile",
		description:
			"Get the profile information of the currently authenticated account user.",
	})
	@ApiResponse({
		status: 200,
		description: "User profile retrieved successfully",
		schema: {
			type: "object",
			properties: {
				id: { type: "string", example: "uuid-string" },
				email: { type: "string", example: "user@example.com" },
				role: { type: "string", example: "individual" },
				emailVerifiedAt: {
					type: "string",
					format: "date-time",
					nullable: true,
				},
				lastLoginAt: {
					type: "string",
					format: "date-time",
					nullable: true,
				},
				createdAt: { type: "string", format: "date-time" },
				individualProfile: {
					type: "object",
					nullable: true,
					properties: {
						firstName: { type: "string", example: "John" },
						lastName: { type: "string", example: "Doe" },
						phoneNumber: { type: "string", example: "+1234567890" },
						profilePicture: {
							type: "object",
							nullable: true,
							properties: {
								publicId: {
									type: "string",
									example: "cloudinary-id",
								},
								url: {
									type: "string",
									example: "https://res.cloudinary.com/...",
								},
							},
						},
					},
				},
				organizationProfile: {
					type: "object",
					nullable: true,
					properties: {
						organizationName: {
							type: "string",
							example: "Acme Corp",
						},
						logoUrl: {
							type: "object",
							nullable: true,
							properties: {
								publicId: {
									type: "string",
									example: "cloudinary-id",
								},
								url: {
									type: "string",
									example: "https://res.cloudinary.com/...",
								},
							},
						},
						industryType: { type: "string", example: "Technology" },
						companySize: { type: "string", example: "51-200" },
						businessAddress: {
							type: "string",
							example: "123 Business St",
						},
						city: { type: "string", example: "New York" },
						state: { type: "string", example: "NY" },
						country: { type: "string", example: "United States" },
						phoneNumber: { type: "string", example: "+1234567890" },
						primaryContactFirstName: {
							type: "string",
							example: "Jane",
						},
						primaryContactLastName: {
							type: "string",
							example: "Smith",
						},
						primaryContactJobTitle: {
							type: "string",
							example: "IT Manager",
						},
						primaryContactEmail: {
							type: "string",
							example: "jane@company.com",
						},
						primaryContactPhoneNumber: {
							type: "string",
							example: "+1234567890",
						},
					},
				},
			},
		},
	})
	@ApiResponse({
		status: 401,
		description: "Unauthorized - Invalid or missing token",
	})
	async me(@Req() req: any) {
		return await this.accountsService.getProfile(req.user.id);
	}

	@Public()
	@Post("verify-email")
	@ApiOperation({
		summary: "Verify email address",
		description:
			"Verify email address using the OTP sent during registration. Sends welcome email after successful verification.",
	})
	@ApiBody({
		description: "Email verification data",
		type: VerifyEmailDto,
	})
	@ApiResponse({
		status: 200,
		description: "Email verified successfully",
		schema: {
			type: "object",
			properties: {
				verified: { type: "boolean", example: true },
			},
		},
	})
	@ApiResponse({
		status: 400,
		description: "Invalid or expired OTP",
		schema: {
			type: "object",
			properties: {
				message: { type: "string", example: "Invalid or expired OTP" },
			},
		},
	})
	async verifyEmail(@Body() body: VerifyEmailDto) {
		return await this.accountsService.verifyEmail(
			body.accountId,
			body.email,
			body.otp,
		);
	}

	@Public()
	@Post("forgot-password")
	@ApiOperation({
		summary: "Request password reset",
		description:
			"Request a password reset link to be sent to the provided email address.",
	})
	@ApiBody({
		description: "Password reset request data",
		type: ForgotPasswordDto,
	})
	@ApiResponse({
		status: 200,
		description: "Password reset email sent (if account exists)",
		schema: {
			type: "object",
			properties: {
				message: {
					type: "string",
					example:
						"If the email exists, a password reset link has been sent",
				},
			},
		},
	})
	async forgotPassword(@Body() body: ForgotPasswordDto) {
		return await this.accountsService.forgotPassword(body);
	}

	@Public()
	@Post("reset-password")
	@ApiOperation({
		summary: "Reset password",
		description:
			"Reset password using the token received via email. Token expires in 1 hour.",
	})
	@ApiBody({
		description: "Password reset data",
		type: ResetPasswordDto,
	})
	@ApiResponse({
		status: 200,
		description: "Password reset successfully",
		schema: {
			type: "object",
			properties: {
				message: {
					type: "string",
					example: "Password has been reset successfully",
				},
			},
		},
	})
	@ApiResponse({
		status: 400,
		description: "Invalid or expired reset token",
		schema: {
			type: "object",
			properties: {
				message: {
					type: "string",
					example: "Invalid or expired reset token",
				},
			},
		},
	})
	async resetPassword(@Body() body: ResetPasswordDto) {
		return await this.accountsService.resetPassword(body);
	}
}
