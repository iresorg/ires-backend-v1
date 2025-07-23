import { Transform } from "class-transformer";
import { TicketStatus } from "../interfaces/ticket.interface";
import { IsEnum, IsNumber, IsOptional, Min } from "class-validator";
import { PaginationQuery } from "@/shared/dto/pagination.dto";

export class GetTicketDto extends PaginationQuery {
    @IsOptional()
    @IsEnum(TicketStatus)
    status?: TicketStatus;
}