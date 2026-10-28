import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, IsString, MinLength } from "class-validator";

export class ResetPasswordDto {
	@ApiProperty({ example: "agent@iresorg.com" })
	@IsEmail()
	email: string;

	@ApiProperty({
		description: "Reset token from the email link",
	})
	@IsString()
	@IsNotEmpty()
	token: string;

	@ApiProperty({
		example: "NewSecurePass1",
		description: "New password. Minimum 8 characters.",
	})
	@IsString()
	@IsNotEmpty()
	@MinLength(8)
	newPassword: string;
}
