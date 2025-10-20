import { IsEmail, IsIn, IsString, MinLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { ACCOUNT_ROLES } from "../types/options";

export class RegisterIndividualDto {
	@ApiProperty({
		description: "User email address",
		example: "john.doe@example.com",
	})
	@IsEmail()
	email: string;

	@ApiProperty({
		description: "User password (minimum 6 characters)",
		example: "securePassword123",
		minLength: 6,
	})
	@IsString()
	@MinLength(6)
	password: string;

	@ApiProperty({
		description: "Account role",
		enum: ACCOUNT_ROLES,
		example: "individual",
	})
	@IsString()
	@IsIn(ACCOUNT_ROLES as readonly string[])
	role: string;

	@ApiProperty({
		description: "User first name",
		example: "John",
	})
	@IsString()
	firstName: string;

	@ApiProperty({
		description: "User last name",
		example: "Doe",
	})
	@IsString()
	lastName: string;

	@ApiProperty({
		description: "User phone number",
		example: "+1234567890",
	})
	@IsString()
	phoneNumber: string;
}
