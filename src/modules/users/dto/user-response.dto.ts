import { ApiProperty } from "@nestjs/swagger";
import { Role } from "../enums/role.enum";
import { Status } from "../enums/status.enum";
import { IUser } from "../interfaces/user.interface";

export class UserResponseDto {
	@ApiProperty({ description: "User unique identifier" })
	id: string;

	@ApiProperty({ description: "User first name" })
	firstName: string;

	@ApiProperty({ description: "User last name" })
	lastName: string;

	@ApiProperty({ description: "User email address" })
	email: string;

	@ApiProperty({ enum: Role, description: "User role in the system" })
	role: Role;

	@ApiProperty({ enum: Status, description: "User account status" })
	status: Status;

	@ApiProperty({ required: false, description: "User avatar URL" })
	avatar?: string;

	@ApiProperty({ required: false, description: "Last login timestamp" })
	lastLogin?: Date;

	@ApiProperty({ description: "Account creation timestamp" })
	createdAt: Date;

	@ApiProperty({ description: "Last update timestamp" })
	updatedAt: Date;

	/**
	 * Transform IUser to UserResponseDto, excluding password
	 */
	static fromUser(user: IUser): UserResponseDto {
		const { password: _, ...userWithoutPassword } = user;
		return userWithoutPassword as UserResponseDto;
	}

	/**
	 * Transform array of IUser to array of UserResponseDto
	 */
	static fromUsers(users: IUser[]): UserResponseDto[] {
		return users.map((user) => UserResponseDto.fromUser(user));
	}
}
