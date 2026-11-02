import { ApiPropertyOptional, OmitType } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsEmail, IsOptional } from "class-validator";
import { CreateIncidentReportDto } from "./create-incident-report.dto";

export class CreateAccountIncidentDto extends OmitType(
	CreateIncidentReportDto,
	["email"] as const,
) {
	@ApiPropertyOptional({
		description:
			"Ignored. The incident is filed on the signed-in account, so no new account email is sent.",
		example: "ada@northwind.example",
	})
	@IsOptional()
	@Transform(({ value }) => {
		if (typeof value !== "string") return value;
		const trimmed = value.trim();
		return trimmed === "" ? undefined : trimmed;
	})
	@IsEmail()
	email?: string;
}
