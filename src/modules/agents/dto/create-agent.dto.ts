import { IsEmail, IsNotEmpty, IsUrl, IsOptional } from "class-validator";
import { Role } from "../../users/enums/role.enum";
import { PartialType } from "@nestjs/swagger";

export class CreateAgentDto {
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
	avatar?: { publicId: string; url: string };

	// role is optional, always set to AGENT in service
	role?: Role;
}

export class UpdateAgentDto extends PartialType(CreateAgentDto) {}
