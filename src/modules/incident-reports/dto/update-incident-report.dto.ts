import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsOptional, IsString, MaxLength } from "class-validator";

const SEVERITIES = ["Critical", "High", "Medium", "Low"] as const;
const ONGOING = ["Yes", "No", "Not sure"] as const;

export class UpdateCustomerIncidentDto {
	@ApiPropertyOptional({ enum: ONGOING })
	@IsOptional()
	@IsIn(ONGOING)
	ongoing?: (typeof ONGOING)[number];

	@ApiPropertyOptional()
	@IsOptional()
	@IsString()
	@MaxLength(40)
	phone?: string;

	@ApiPropertyOptional()
	@IsOptional()
	@IsString()
	@MaxLength(40)
	detectedAt?: string;

	@ApiPropertyOptional()
	@IsOptional()
	@IsString()
	@MaxLength(2000)
	affectedSystems?: string;

	@ApiPropertyOptional()
	@IsOptional()
	@IsString()
	@MaxLength(8000)
	description?: string;
}

export class UpdateStaffIncidentDto extends UpdateCustomerIncidentDto {
	@ApiPropertyOptional({ enum: SEVERITIES })
	@IsOptional()
	@IsIn(SEVERITIES)
	severity?: (typeof SEVERITIES)[number];

	@ApiPropertyOptional()
	@IsOptional()
	@IsString()
	@MaxLength(200)
	incidentType?: string;
}
