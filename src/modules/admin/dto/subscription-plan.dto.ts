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
} from "class-validator";
import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { Type } from "class-transformer";

export class CreateSubscriptionPlanDto {
	@ApiProperty({ example: "Basic Shield" })
	@IsString()
	@IsNotEmpty()
	name: string;

	@ApiProperty({ example: 1 })
	@Type(() => Number)
	@IsInt()
	@Min(1)
	tier: number;

	@ApiProperty({ enum: ["individual", "organization"] })
	@IsIn(["individual", "organization"])
	accountType: "individual" | "organization";

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

	@ApiPropertyOptional({ example: "monthly" })
	@IsOptional()
	@IsString()
	interval?: string;

	@ApiPropertyOptional({
		description:
			"Existing Paystack plan code. If omitted, a Paystack plan is created automatically.",
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

	@ApiPropertyOptional({ example: 1, nullable: true })
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
