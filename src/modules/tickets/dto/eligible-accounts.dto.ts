import { IsEnum, IsOptional, IsString } from "class-validator";
import { PaginationQuery } from "@/shared/dto/pagination.dto";
import { TicketEntitlementSource } from "../entities/ticket.entity";

export class EligibleAccountsQueryDto extends PaginationQuery {
	@IsOptional()
	@IsString()
	search?: string;

	@IsOptional()
	@IsEnum(TicketEntitlementSource)
	source?: TicketEntitlementSource;
}
