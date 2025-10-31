import { IsNotEmpty, IsString, IsUUID } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class InitializeSubscriptionDto {
	@ApiProperty({
		description: "Subscription plan ID",
		example: "uuid-string",
	})
	@IsNotEmpty()
	@IsUUID()
	planId: string;

	@ApiProperty({
		description: "Callback URL after payment",
		example: "https://your-app.com/subscription/success",
	})
	@IsString()
	callbackUrl: string;
}
