import { IsEmail, IsString, IsNotEmpty } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class VerifyEmailDto {
	@ApiProperty({
		description: "Account ID to verify",
		example: "uuid-string",
	})
	@IsNotEmpty()
	@IsString()
	accountId: string;

	@ApiProperty({
		description: "Email address to verify",
		example: "user@example.com",
	})
	@IsEmail()
	email: string;

	@ApiProperty({
		description: "One-time password (OTP) received via email",
		example: "123456",
	})
	@IsNotEmpty()
	@IsString()
	otp: string;
}
