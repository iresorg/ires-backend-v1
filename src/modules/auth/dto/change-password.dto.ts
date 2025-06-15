import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

export class ChangePasswordDto {
	@ApiProperty({
		example: "password123",
		description: "User new password",
	})
	@IsString({ message: "Password must be a string" })
	newPassword: string;

	@ApiProperty({
		example: "password123",
		description: "User old password",
	})
	@IsString({ message: "Password must be a string" })
	oldPassword: string;
}
