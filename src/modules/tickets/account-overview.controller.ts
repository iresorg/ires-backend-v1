import { Controller, Get, Req, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { AccountsAuthGuard } from "@/shared/guards/accounts-auth.guard";
import { TicketsService } from "./service";

@ApiTags("Account overview")
@UseGuards(AccountsAuthGuard)
@Controller("accounts")
export class AccountOverviewController {
	constructor(private readonly ticketsService: TicketsService) {}

	@Get("overview")
	@ApiOperation({
		summary: "Stats overview for the signed-in account",
		description:
			"Incident counts, ticket counts, and remaining incident coverage for the customer dashboard.",
	})
	async overview(@Req() req: { user: { id: string } }) {
		const data = await this.ticketsService.getAccountOverview(req.user.id);
		return { message: "Overview fetched", ...data };
	}
}
