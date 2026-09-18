import {
	Controller,
	Get,
	Param,
	Query,
	Req,
	UseGuards,
} from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { TicketsService } from "./service";
import {
	ITicket,
	ITicketLifecycle,
	ITicketSummary,
} from "./interfaces/ticket.interface";
import { AccountsAuthGuard } from "@/shared/guards/accounts-auth.guard";
import { GetTicketDto } from "./dto/get-ticket.dto";
import { PaginationQuery } from "@/shared/dto/pagination.dto";

@ApiTags("Account Tickets")
@UseGuards(AccountsAuthGuard)
@Controller("accounts/tickets")
export class AccountTicketsController {
	constructor(private readonly ticketsService: TicketsService) {}

	@ApiOperation({
		summary: "List tickets created for the logged-in account",
	})
	@ApiResponse({ status: 200, description: "Tickets fetched successfully" })
	@Get()
	async getMyTickets(
		@Req() req: { user: { id: string } },
		@Query() query: GetTicketDto,
	): Promise<{ message: string; data: ITicketSummary[] }> {
		const data = await this.ticketsService.getAccountTickets(
			req.user.id,
			query,
		);
		return {
			message: "Tickets fetched successfully",
			...data,
		};
	}

	@ApiOperation({ summary: "Get one of your tickets by id" })
	@ApiResponse({ status: 200, description: "Ticket fetched successfully" })
	@Get(":ticketId")
	async getMyTicket(
		@Req() req: { user: { id: string } },
		@Param("ticketId") ticketId: string,
	): Promise<{ message: string; data: ITicket }> {
		const data = await this.ticketsService.getAccountTicketById(
			req.user.id,
			ticketId,
		);
		return {
			message: "Ticket fetched successfully",
			data,
		};
	}

	@ApiOperation({ summary: "Get lifecycle updates for one of your tickets" })
	@ApiResponse({
		status: 200,
		description: "Ticket lifecycle fetched successfully",
	})
	@Get(":ticketId/lifecycle")
	async getMyTicketLifecycle(
		@Req() req: { user: { id: string } },
		@Param("ticketId") ticketId: string,
		@Query() query: PaginationQuery,
	): Promise<{ message: string; data: ITicketLifecycle[] }> {
		const data = await this.ticketsService.getAccountTicketLifecycle(
			req.user.id,
			ticketId,
			query,
		);
		return {
			message: "Ticket life cycle fetched successfully",
			...data,
		};
	}
}
