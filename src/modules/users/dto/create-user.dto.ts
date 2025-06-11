import {
	IsEmail,
	IsString,
	MinLength,
	IsEnum,
	IsOptional,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { Role } from "../enums/role.enum";

export class CreateUserDto {
	@ApiProperty({ description: "User first name", minLength: 2 })
	@IsString()
	@MinLength(2)
	firstName: string;

	@ApiProperty({ description: "User last name", minLength: 2 })
	@IsString()
	@MinLength(2)
	lastName: string;

	@ApiProperty({ description: "User email address" })
	@IsEmail()
	email: string;

	@ApiProperty({ description: "User password", minLength: 8 })
	@IsString()
	@MinLength(8)
	password: string;

	@ApiProperty({ description: "User role", enum: Role, required: false })
	@IsEnum(Role)
	@IsOptional()
	role?: Role;
}
