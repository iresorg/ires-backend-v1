import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsOptional, IsString } from "class-validator";

export class NewsletterSubscribeDto {
	@ApiProperty({
		description: "Email address to subscribe to the newsletter",
		example: "user@example.com",
	})
	@IsEmail()
	email: string;

	@ApiProperty({
		description: "First name of the subscriber (optional)",
		example: "John",
		required: false,
	})
	@IsOptional()
	@IsString()
	firstName?: string;

	@ApiProperty({
		description: "Last name of the subscriber (optional)",
		example: "Doe",
		required: false,
	})
	@IsOptional()
	@IsString()
	lastName?: string;
}
