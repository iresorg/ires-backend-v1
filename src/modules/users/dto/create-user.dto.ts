import {
	IsEmail,
	IsString,
	MinLength,
	IsEnum,
	IsOptional,
	IsUrl,
	Validate,
	ValidatorConstraint,
	ValidatorConstraintInterface,
} from "class-validator";
import { ApiProperty, PartialType } from "@nestjs/swagger";
import { Role } from "../enums/role.enum";

@ValidatorConstraint({ name: "notSuperAdmin", async: false })
class NotSuperAdmin implements ValidatorConstraintInterface {
	validate(role: Role) {
		return role !== Role.SUPER_ADMIN;
	}
	defaultMessage() {
		return "Cannot create user with SUPER_ADMIN role.";
	}
}

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

	@ApiProperty({ description: "User avatar URL", required: false })
	@IsOptional()
	@IsString()
	@IsUrl(
		{ require_protocol: true },
		{ message: "Avatar must be a valid URL with protocol (http/https)" },
	)
	avatar?: string;

	@ApiProperty({ description: "User role", enum: Role, required: false })
	@IsEnum(Role)
	@IsOptional()
	@Validate(NotSuperAdmin)
	role?: Role;
}

export class UpdateUserDto extends PartialType(CreateUserDto) {}
