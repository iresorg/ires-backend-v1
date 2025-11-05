import { IsEmail, IsNotEmpty } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class ResendOtpDto {
	@ApiProperty({
		description: "Email address to resend OTP to",
		example: "user@example.com",
	})
	@IsEmail()
	@IsNotEmpty()
	email: string;
}
