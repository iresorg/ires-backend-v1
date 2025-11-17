import { IsOptional, IsString, IsEnum, IsUUID } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { SubscriptionStatus } from "@/modules/subscriptions/entities/subscription.entity";

export class SubscribersQueryDto {
	@ApiPropertyOptional({
		description: "Search by subscriber name or email",
		example: "john@example.com",
	})
	@IsOptional()
	@IsString()
	search?: string;

	@ApiPropertyOptional({
		description: "Filter by subscription status",
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
