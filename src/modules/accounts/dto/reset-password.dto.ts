import { IsEmail, IsString, MinLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class ResetPasswordDto {
	@ApiProperty({
		description: "Email address associated with the account",
		example: "user@example.com",
	})
	@IsEmail()
	email: string;

	@ApiProperty({
		description: "Password reset token received via email",
		example: "abc123def456ghi789jkl012mno345pqr678stu901vwx234yz",
	})
	@IsString()
	token: string;

	@ApiProperty({
		description: "New password (minimum 6 characters)",
		example: "newSecurePassword123",
		minLength: 6,
	})
	@IsString()
	@MinLength(6)
	newPassword: string;
}
