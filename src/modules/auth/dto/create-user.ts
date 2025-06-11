import { Role } from "@/modules/users/enums/role.enum";
import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, IsString, Matches } from "class-validator";

export class CreateUserDto {
	@ApiProperty({
		example: "John",
		description: "The first name of the user",
	})
	@IsNotEmpty()
	@IsString()
	firstName: string;

	@ApiProperty({
		example: "Doe",
		description: "The last name of the user",
	})
	@IsNotEmpty()
	@IsString()
	lastName: string;

	@ApiProperty({
		example: "email@email.com",
		description: "The email address of the user",
	})
	@IsNotEmpty()
	@IsEmail()
	email: string;

	@ApiProperty({
		example: "TIER1_RESPONDER",
		description: "Role of the user being added",
	})
	@IsNotEmpty()
	@Matches(
		new RegExp(
			`^${Object.values(Role)
				.filter((v) => v !== Role.SUPER_ADMIN) // Ensure SUPER_ADMIN role cannot be created from the client side
				.join("|")}$`,
		),
		{ message: "Invalid role selected" },
	)
	role: Role;
}

export class CreateUserResponseDto {
	id: string;
	firstName: string;
	lastName: string;
	email: string;
	role: Role;
	createdAt: Date;
	updatedAt: Date;
	lastLogin?: Date;
}
