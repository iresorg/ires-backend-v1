import { IsNotEmpty, IsString, MinLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class ChangePasswordDto {
	@ApiProperty({
		description: "Current password",
		example: "currentPassword123",
	})
	@IsString()
	@IsNotEmpty()
	currentPassword: string;

	@ApiProperty({
		description: "New password (minimum 6 characters)",
		example: "newSecurePassword123",
		minLength: 6,
	})
	@IsString()
	@MinLength(6)
	newPassword: string;
}
