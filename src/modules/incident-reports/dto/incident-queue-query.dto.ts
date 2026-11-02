import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsBoolean, IsIn, IsOptional } from "class-validator";
import { PaginationQuery } from "@/shared/dto/pagination.dto";

export class IncidentQueueQuery extends PaginationQuery {
	@ApiPropertyOptional({ enum: ["OPEN", "CLOSED"] })
	@IsOptional()
	@IsIn(["OPEN", "CLOSED"])
	status?: "OPEN" | "CLOSED";

	@ApiPropertyOptional({
		description: "false = unassigned queue. Ignored for agents.",
	})
	@IsOptional()
	@Transform(({ value }) => {
		if (value === "true" || value === true) return true;
		if (value === "false" || value === false) return false;
		return value;
	})
	@IsBoolean()
	assigned?: boolean;
}
