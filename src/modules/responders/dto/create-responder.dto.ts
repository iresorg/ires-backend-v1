import { IsEmail, IsNotEmpty } from "class-validator";
import { Role } from "../../users/enums/role.enum";

export class CreateResponderDto {
	@IsNotEmpty()
	firstName: string;

	@IsNotEmpty()
	lastName: string;

	@IsEmail()
	email: string;

	role: Role; // Must be RESPONDER_TIER_1 or RESPONDER_TIER_2
}
