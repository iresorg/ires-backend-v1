import { IsEnum, IsIn, IsOptional, IsString } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { TransactionStatus } from "@/modules/subscriptions/entities/transaction.entity";
import { PlanPaymentType } from "@/modules/subscriptions/enums/plan-payment-type.enum";

export class FinancialsOverviewQueryDto {
	@ApiPropertyOptional({
		description: "ISO date — include transactions on/after this day",
		example: "2026-01-01",
	})
	@IsOptional()
	@IsString()
	from?: string;

	@ApiPropertyOptional({
		description: "ISO date — include transactions on/before this day",
		example: "2026-09-18",
	})
	@IsOptional()
	@IsString()
	to?: string;

	@ApiPropertyOptional({
		description: "Months of revenue chart history (default 6)",
		example: 6,
	})
	@IsOptional()
	@Transform(({ value }) => parseInt(value, 10))
	months?: number;
}

export class FinancialsTransactionsQueryDto {
	@ApiPropertyOptional({ description: "Search by email, name, or reference" })
	@IsOptional()
	@IsString()
	search?: string;

	@ApiPropertyOptional({ enum: TransactionStatus })
	@IsOptional()
	@IsEnum(TransactionStatus)
	status?: TransactionStatus;

	@ApiPropertyOptional({
		enum: PlanPaymentType,
		description: "subscription = recurring charges; one_time = PAYG",
	})
	@IsOptional()
	@IsIn(Object.values(PlanPaymentType))
	paymentType?: PlanPaymentType;

	@ApiPropertyOptional({ example: "2026-01-01" })
	@IsOptional()
	@IsString()
	from?: string;

	@ApiPropertyOptional({ example: "2026-09-18" })
	@IsOptional()
	@IsString()
	to?: string;

	@ApiPropertyOptional({ example: 1 })
	@IsOptional()
	@Transform(({ value }) => parseInt(value, 10))
	page?: number;

	@ApiPropertyOptional({ example: 10 })
	@IsOptional()
	@Transform(({ value }) => parseInt(value, 10))
	limit?: number;
}

export class PaystackSettlementsQueryDto {
	@ApiPropertyOptional({ example: 1 })
	@IsOptional()
	@Transform(({ value }) => parseInt(value, 10))
	page?: number;

	@ApiPropertyOptional({ example: 20 })
	@IsOptional()
	@Transform(({ value }) => parseInt(value, 10))
	perPage?: number;

	@ApiPropertyOptional({
		description: "Filter settlements from date (YYYY-MM-DD)",
	})
	@IsOptional()
	@IsString()
	from?: string;

	@ApiPropertyOptional({
		description: "Filter settlements to date (YYYY-MM-DD)",
	})
	@IsOptional()
	@IsString()
	to?: string;
}
