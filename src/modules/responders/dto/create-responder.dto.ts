import { IsEmail, IsNotEmpty, IsUrl, IsOptional } from "class-validator";
import { Role } from "../../users/enums/role.enum";
import { PartialType } from "@nestjs/swagger";

export class CreateResponderDto {
	@IsNotEmpty()
	firstName: string;

	@IsNotEmpty()
	lastName: string;

	@IsEmail()
	email: string;

	@IsOptional()
	@IsUrl(
		{ require_protocol: true },
		{ message: "Avatar must be a valid URL with protocol (http/https)" },
	)
	avatar?: string;

	role: Role; // Must be RESPONDER_TIER_1 or RESPONDER_TIER_2
}

export class UpdateResponderDto extends PartialType(CreateResponderDto) {}
