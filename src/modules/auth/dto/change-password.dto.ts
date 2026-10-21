import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString, MinLength, ValidateIf } from "class-validator";

export class ChangePasswordDto {
	@ApiProperty({
		example: "TempPass1",
		description:
			"Current password. For a first login this is the temporary password from the welcome email.",
	})
	@ValidateIf((o: ChangePasswordDto) => !o.oldPassword)
	@IsString()
	@IsNotEmpty()
	currentPassword?: string;

	@ApiPropertyOptional({
		description: "Accepted alias for currentPassword",
	})
	@IsOptional()
	@IsString()
	oldPassword?: string;

	@ApiProperty({
		example: "NewSecurePass1",
		description: "New password. Minimum 8 characters.",
	})
	@IsString()
	@IsNotEmpty()
	@MinLength(8)
	newPassword: string;
}
