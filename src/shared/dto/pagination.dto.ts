import { IsOptional, IsNumber, Min } from "class-validator";
import { Transform } from "class-transformer";

export class PaginationQuery {
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