import { IsEmail, IsNotEmpty } from "class-validator";
import { Role } from "../../users/enums/role.enum";

export class CreateAgentDto {
	@IsNotEmpty()
	firstName: string;

	@IsNotEmpty()
	lastName: string;

	@IsEmail()
	email: string;

	// role is optional, always set to AGENT in service
	role?: Role;
}
