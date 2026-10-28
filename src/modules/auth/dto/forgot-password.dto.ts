import { ApiProperty } from "@nestjs/swagger";
import { IsEmail } from "class-validator";

export class ForgotPasswordDto {
	@ApiProperty({
		example: "agent@iresorg.com",
		description: "Staff email address (admin, agent, or responder)",
	})
	@IsEmail()
	email: string;
}
