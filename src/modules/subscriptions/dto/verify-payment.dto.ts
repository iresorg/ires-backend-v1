import { IsNotEmpty, IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class VerifyPaymentDto {
	@ApiProperty({
		description: "Payment reference from Paystack",
		example: "tx_1234567890",
	})
	@IsNotEmpty()
	@IsString()
	reference: string;
}
