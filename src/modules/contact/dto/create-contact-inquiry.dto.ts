import { ApiProperty } from "@nestjs/swagger";
import {
	IsEmail,
	IsNotEmpty,
	IsString,
	MaxLength,
	MinLength,
} from "class-validator";

export class CreateContactInquiryDto {
	@ApiProperty({ example: "Simisola Olubodun" })
	@IsString()
	@IsNotEmpty()
	@MaxLength(120)
	name: string;

	@ApiProperty({ example: "you@example.com" })
	@IsEmail()
	email: string;

	@ApiProperty({ example: "08120827393" })
	@IsString()
	@IsNotEmpty()
	@MaxLength(40)
	phone: string;

	@ApiProperty({
		example: "General Inquiry",
		description:
			"Subject from the inquiry form (e.g. General Inquiry, Support, Partnership)",
	})
	@IsString()
	@IsNotEmpty()
	@MaxLength(120)
	subject: string;

	@ApiProperty({ example: "Just testing" })
	@IsString()
	@IsNotEmpty()
	@MinLength(5)
	@MaxLength(5000)
	message: string;
}
