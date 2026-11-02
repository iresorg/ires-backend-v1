import {
	Body,
	Controller,
	Get,
	Param,
	Patch,
	Post,
	Query,
	Req,
	UseGuards,
} from "@nestjs/common";
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Request } from "express";
import { Public } from "@/shared/decorators/public.decorator";
import { AuthGuard } from "@/shared/guards/auth.guard";
import { RoleGuard } from "@/shared/guards/roles.guard";
import { Roles } from "@/shared/decorators/role.decorator";
import { Role } from "@/modules/users/enums/role.enum";
import { AuthRequest } from "@/shared/interfaces/request.interface";
import { CreateIncidentReportDto } from "./dto/create-incident-report.dto";
import { IncidentQueueQuery } from "./dto/incident-queue-query.dto";
import { UpdateStaffIncidentDto } from "./dto/update-incident-report.dto";
import { AssignIncidentDto } from "./dto/assign-incident.dto";
import { LinkIncidentTicketDto } from "./dto/link-incident-ticket.dto";
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

	@Post("staff")
	@UseGuards(AuthGuard, RoleGuard)
	@Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.AGENT_ADMIN)
	@ApiOperation({
		summary: "Create an incident for a customer email",
		description:
			"Same body as the public form. Creates an individual account and emails a temporary password when the email is new.",
	})
	@ApiBody({ type: CreateIncidentReportDto })
	async submitForStaff(
		@Body() body: CreateIncidentReportDto,
		@Req() req: AuthRequest,
	) {
		return await this.incidentReports.submitForStaff(body, req.user.id);
	}

	@Get("queue")
	@UseGuards(AuthGuard, RoleGuard)
	@Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.AGENT_ADMIN, Role.AGENT)
	@ApiOperation({ summary: "Incident queue for the staff dashboard" })
	async queue(@Query() query: IncidentQueueQuery, @Req() req: AuthRequest) {
		const data = await this.incidentReports.queue(
			{ id: req.user.id, role: req.user.role },
			query,
		);
		return { message: "Incidents fetched", ...data };
	}

	@Get(":id")
	@UseGuards(AuthGuard, RoleGuard)
	@Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.AGENT_ADMIN, Role.AGENT)
	@ApiOperation({ summary: "Get an incident" })
	async getOne(@Param("id") id: string, @Req() req: AuthRequest) {
		const data = await this.incidentReports.getForStaff(
			{ id: req.user.id, role: req.user.role },
			id,
		);
		return { message: "Incident fetched", ...data };
	}

	@Patch(":id")
	@UseGuards(AuthGuard, RoleGuard)
	@Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.AGENT_ADMIN, Role.AGENT)
	@ApiOperation({ summary: "Update an open incident" })
	async update(
		@Param("id") id: string,
		@Body() body: UpdateStaffIncidentDto,
		@Req() req: AuthRequest,
	) {
		const data = await this.incidentReports.updateForStaff(
			{ id: req.user.id, role: req.user.role },
			id,
			body,
		);
		return { message: "Incident updated", ...data };
	}

	@Patch(":id/assign")
	@UseGuards(AuthGuard, RoleGuard)
	@Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.AGENT_ADMIN)
	@ApiOperation({ summary: "Assign an agent to monitor an incident" })
	async assign(
		@Param("id") id: string,
		@Body() body: AssignIncidentDto,
	) {
		const data = await this.incidentReports.assignAgent(id, body.agentId);
		return { message: "Incident assigned", ...data };
	}

	@Post(":id/ticket")
	@UseGuards(AuthGuard, RoleGuard)
	@Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.AGENT_ADMIN)
	@ApiOperation({ summary: "Link an incident to a ticket" })
	async linkTicket(
		@Param("id") id: string,
		@Body() body: LinkIncidentTicketDto,
	) {
		const data = await this.incidentReports.linkTicket(id, body.ticketId);
		return { message: "Incident linked to ticket", ...data };
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
