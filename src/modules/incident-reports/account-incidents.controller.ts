import {
	Body,
	Controller,
	Get,
	Param,
	Patch,
	Query,
	Req,
	UseGuards,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { AccountsAuthGuard } from "@/shared/guards/accounts-auth.guard";
import { IncidentReportsService } from "./incident-reports.service";
import { IncidentQueueQuery } from "./dto/incident-queue-query.dto";
import { UpdateCustomerIncidentDto } from "./dto/update-incident-report.dto";

@ApiTags("Account incidents")
@UseGuards(AccountsAuthGuard)
@Controller("accounts/incidents")
export class AccountIncidentsController {
	constructor(private readonly incidents: IncidentReportsService) {}

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
