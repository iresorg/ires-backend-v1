import { IsDateString, IsNotEmpty } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class GenerateTokenDto {
	@ApiProperty({
		description:
			"Token expiration date in ISO format (YYYY-MM-DDTHH:mm:ssZ)",
		example: "2024-12-31T23:59:59Z",
	})
	@IsNotEmpty({ message: "Expiration date is required" })
	@IsDateString(
		{},
		{
			message:
				"Invalid date format. Please use ISO format (YYYY-MM-DDTHH:mm:ssZ)",
		},
	)
	expiresAt: string;
}
