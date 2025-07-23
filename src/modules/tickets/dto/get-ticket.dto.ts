import { Transform } from "class-transformer";
import { TicketStatus } from "../interfaces/ticket.interface";
import { IsEnum, IsNumber, IsOptional, Min } from "class-validator";

export class GetTicketDto {
    @IsOptional()
    @IsEnum(TicketStatus)
    status?: TicketStatus

    @IsOptional()
    @IsNumber()
    @Min(1)
    @Transform(({ value }: { value: string }) => parseInt(value))
    page?: number;

    @IsOptional()
    @IsNumber()
    @Min(5)
    @Transform(({ value }: { value: string }) => parseInt(value))
    limit?: number;
}