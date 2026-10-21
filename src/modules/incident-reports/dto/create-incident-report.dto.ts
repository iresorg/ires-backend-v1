import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import {
	Equals,
	IsBoolean,
	IsEmail,
	IsIn,
	IsNotEmpty,
	IsOptional,
	IsString,
	MaxLength,
} from "class-validator";

const SEVERITIES = ["Critical", "High", "Medium", "Low"] as const;
const ONGOING = ["Yes", "No", "Not sure"] as const;

function trimString({ value }: { value: unknown }) {
	if (typeof value !== "string") return value;
	const trimmed = value.trim();
	return trimmed === "" ? undefined : trimmed;
}

export class CreateIncidentReportDto {
	@ApiProperty({ enum: SEVERITIES, example: "Critical" })
	@IsIn(SEVERITIES, {
		message: "severity must be one of Critical, High, Medium, Low",
	})
	severity: (typeof SEVERITIES)[number];

	@ApiProperty({
		example: "Ransomware",
		description: "Free-text incident type from the report form",
	})
	@Transform(trimString)
	@IsString()
	@IsNotEmpty()
	@MaxLength(200)
	incidentType: string;

	@ApiProperty({ enum: ONGOING, example: "Yes" })
	@IsIn(ONGOING, {
		message: "ongoing must be one of Yes, No, Not sure",
	})
	ongoing: (typeof ONGOING)[number];

	@ApiProperty({ example: "Ada Okonkwo" })
	@Transform(trimString)
	@IsString()
	@IsNotEmpty()
	@MaxLength(120)
	name: string;

	@ApiProperty({ example: "Northwind Ltd" })
	@Transform(trimString)
	@IsString()
	@IsNotEmpty()
	@MaxLength(200)
	organization: string;

	@ApiProperty({ example: "08031234567" })
	@Transform(trimString)
	@IsString()
	@IsNotEmpty()
	@MaxLength(40)
	phone: string;

	@ApiProperty({ example: "ada@northwind.example" })
	@Transform(trimString)
	@IsEmail()
	email: string;

	@ApiPropertyOptional({ example: "2026-10-21T14:30" })
	@IsOptional()
	@Transform(trimString)
	@IsString()
	@MaxLength(40)
	detectedAt?: string;

	@ApiPropertyOptional({ example: "Email and file server" })
	@IsOptional()
	@Transform(trimString)
	@IsString()
	@MaxLength(2000)
	affectedSystems?: string;

	@ApiProperty({
		example:
			"Staff cannot open shared files. A ransom note is on the desktop.",
	})
	@Transform(trimString)
	@IsString()
	@IsNotEmpty()
	@MaxLength(8000)
	description: string;

	@ApiProperty({ example: true })
	@IsBoolean()
	@Equals(true, { message: "confirmed must be true" })
	confirmed: boolean;
}
