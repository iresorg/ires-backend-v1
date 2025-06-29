import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class ResponderLoginDto {
	@ApiProperty({
		description: "The unique identifier of the responder",
		example: "RESP123A",
	})
	@IsString()
	@IsNotEmpty({ message: "Responder ID is required" })
	responderId: string;

	@ApiProperty({
		description: "The authentication token for the responder",
		example: "abc123xyz",
	})
	@IsString()
	@IsNotEmpty({ message: "Token is required" })
	token: string;
}
