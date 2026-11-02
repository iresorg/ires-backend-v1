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
import { ApiBody, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AccountsAuthGuard } from "@/shared/guards/accounts-auth.guard";
import { IncidentReportsService } from "./incident-reports.service";
import { CreateAccountIncidentDto } from "./dto/create-account-incident.dto";
import { IncidentQueueQuery } from "./dto/incident-queue-query.dto";
import { UpdateCustomerIncidentDto } from "./dto/update-incident-report.dto";

@ApiTags("Account incidents")
@UseGuards(AccountsAuthGuard)
@Controller("accounts/incidents")
export class AccountIncidentsController {
	constructor(private readonly incidents: IncidentReportsService) {}

	@Post()
	@ApiOperation({
		summary: "Create an incident for the signed-in account",
		description:
			"Uses the account email. Support receives the incident. The customer receives a notice that the incident was created, with no password and no sign-in link.",
	})
	@ApiBody({ type: CreateAccountIncidentDto })
	async create(
		@Req() req: { user: { id: string } },
		@Body() body: CreateAccountIncidentDto,
	) {
		return await this.incidents.submitForAccount(req.user.id, body);
	}

	@Get()
	@ApiOperation({ summary: "List incidents for the signed-in account" })
	async list(
		@Req() req: { user: { id: string } },
		@Query() query: IncidentQueueQuery,
	) {
		const data = await this.incidents.listForAccount(
			req.user.id,
			query.page ?? 1,
			query.limit ?? 10,
			query.status,
		);
		return { message: "Incidents fetched", ...data };
	}

	@Get(":id")
	@ApiOperation({ summary: "Get one incident for the signed-in account" })
	async getOne(
		@Req() req: { user: { id: string } },
		@Param("id") id: string,
	) {
		const data = await this.incidents.getForAccount(req.user.id, id);
		return { message: "Incident fetched", ...data };
	}

	@Patch(":id")
	@ApiOperation({
		summary: "Update an open incident owned by the signed-in account",
	})
	async update(
		@Req() req: { user: { id: string } },
		@Param("id") id: string,
		@Body() body: UpdateCustomerIncidentDto,
	) {
		const data = await this.incidents.updateForAccount(req.user.id, id, body);
		return { message: "Incident updated", ...data };
	}
}
