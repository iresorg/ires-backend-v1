import { Body, Controller, Post, Req } from "@nestjs/common";
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Request } from "express";
import { Public } from "@/shared/decorators/public.decorator";
import { CreateIncidentReportDto } from "./dto/create-incident-report.dto";
import { IncidentReportsService } from "./incident-reports.service";

@ApiTags("Incident reports")
@Controller("incident-reports")
export class IncidentReportsController {
	constructor(private readonly incidentReports: IncidentReportsService) {}

	@Public()
	@Post()
	@ApiOperation({
		summary: "Submit an incident report",
		description:
			"Public /report form. Emails the report to SUPPORT_EMAIL. No authentication.",
	})
	@ApiBody({ type: CreateIncidentReportDto })
	@ApiResponse({
		status: 201,
		description: "Report emailed to support",
		schema: {
			type: "object",
			properties: {
				message: {
					type: "string",
					example: "Incident report received",
				},
			},
		},
	})
	@ApiResponse({ status: 400, description: "Invalid report" })
	@ApiResponse({ status: 429, description: "Too many reports from this client" })
	@ApiResponse({ status: 500, description: "Report email was not sent" })
	async submit(@Body() body: CreateIncidentReportDto, @Req() req: Request) {
		return await this.incidentReports.submit(body, clientIp(req));
	}
}

function clientIp(req: Request): string {
	const forwarded = req.headers["x-forwarded-for"];
	if (typeof forwarded === "string" && forwarded.trim()) {
		return forwarded.split(",")[0].trim();
	}
	if (Array.isArray(forwarded) && forwarded[0]) {
		return forwarded[0].split(",")[0].trim();
	}
	return req.ip || "unknown";
}
