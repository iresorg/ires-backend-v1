import { IsOptional, IsString, IsEnum, IsUUID, IsIn } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { SubscriptionStatus } from "@/modules/subscriptions/entities/subscription.entity";
import { PlanPaymentType } from "@/modules/subscriptions/enums/plan-payment-type.enum";

export class SubscribersQueryDto {
	@ApiPropertyOptional({
		description: "Search by subscriber name or email",
		example: "john@example.com",
	})
	@IsOptional()
	@IsString()
	search?: string;

	@ApiPropertyOptional({
		description: "Filter by subscription status (recurring only)",
		enum: SubscriptionStatus,
		example: SubscriptionStatus.ACTIVE,
	})
	@IsOptional()
	@IsEnum(SubscriptionStatus)
	status?: SubscriptionStatus;

	@ApiPropertyOptional({
		description: "Filter by subscription plan ID",
		example: "uuid-string",
	})
	@IsOptional()
	@IsUUID()
	planId?: string;

	@ApiPropertyOptional({
		description:
			"Omit to return all (subscription + one_time). subscription = recurring only. one_time = pay-as-you-go purchasers/credits.",
		enum: PlanPaymentType,
		example: PlanPaymentType.SUBSCRIPTION,
	})
	@IsOptional()
	@IsIn(Object.values(PlanPaymentType))
	paymentType?: PlanPaymentType;

	@ApiPropertyOptional({
		description: "Page number (starts from 1)",
		example: 1,
		minimum: 1,
	})
	@IsOptional()
	@Transform(({ value }) => parseInt(value))
	page?: number;

	@ApiPropertyOptional({
		description: "Number of items per page (minimum 5)",
		example: 10,
		minimum: 5,
	})
	@IsOptional()
	@Transform(({ value }) => parseInt(value))
	limit?: number;
}
