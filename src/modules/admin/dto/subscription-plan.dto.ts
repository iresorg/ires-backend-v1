import {
	IsArray,
	IsBoolean,
	IsIn,
	IsInt,
	IsNotEmpty,
	IsNumber,
	IsOptional,
	IsString,
	Min,
	ValidateIf,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { PlanPaymentType } from "@/modules/subscriptions/enums/plan-payment-type.enum";

export class CreateSubscriptionPlanDto {
	@ApiProperty({ example: "Basic Shield" })
	@IsString()
	@IsNotEmpty()
	name: string;

	@ApiProperty({
		example: 1,
		description: "Display / ranking tier. Can be 0 for PAYG products.",
	})
	@Type(() => Number)
	@IsInt()
	@Min(0)
	tier: number;

	@ApiProperty({ enum: ["individual", "organization"] })
	@IsIn(["individual", "organization"])
	accountType: "individual" | "organization";

	@ApiProperty({
		enum: PlanPaymentType,
		example: PlanPaymentType.SUBSCRIPTION,
		description:
			"subscription = recurring plan (Paystack subscription). one_time = pay-as-you-go (single charge, no recurring).",
	})
	@IsIn(Object.values(PlanPaymentType))
	paymentType: PlanPaymentType;

	@ApiProperty({
		example: 5000000,
		description: "Amount in kobo (₦50,000 = 5000000)",
	})
	@Type(() => Number)
	@IsNumber()
	@Min(0)
	amount: number;

	@ApiPropertyOptional({ example: "NGN" })
	@IsOptional()
	@IsString()
	currency?: string;

	@ApiPropertyOptional({
		example: "monthly",
		description:
			"Billing interval for subscription plans only (e.g. monthly). Ignored for one_time.",
	})
	@ValidateIf((o) => o.paymentType === PlanPaymentType.SUBSCRIPTION)
	@IsOptional()
	@IsString()
	interval?: string;

	@ApiPropertyOptional({
		description:
			"Existing Paystack plan code for subscriptions. If omitted on subscription create, Paystack creates one. Always ignored for one_time.",
	})
	@IsOptional()
	@IsString()
	paystackPlanCode?: string;

	@ApiProperty({ example: "For everyday phone & social media users" })
	@IsString()
	@IsNotEmpty()
	description: string;

	@ApiProperty({ type: [String] })
	@IsArray()
	@IsString({ each: true })
	features: string[];

	@ApiPropertyOptional({
		example: 1,
		nullable: true,
		description: "For one_time defaults to 1 if omitted",
	})
	@IsOptional()
	@Type(() => Number)
	@IsInt()
	maxIncidents?: number | null;

	@ApiPropertyOptional({ example: true })
	@IsOptional()
	@IsBoolean()
	active?: boolean;
}

export class UpdateSubscriptionPlanDto extends PartialType(
	CreateSubscriptionPlanDto,
) {}
