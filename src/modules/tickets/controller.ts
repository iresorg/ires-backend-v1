import {
	Body,
	Controller,
	Get,
	Param,
	Post,
	Req,
	Patch,
	UseGuards,
	Query,
} from "@nestjs/common";
import { TicketsService } from "./service";
import { CreateTicketDto } from "./dto/create-ticket.dto";
import {
	ITicket,
	ITicketLifecycle,
	ITicketSummary,
	TicketStatus,
} from "./interfaces/ticket.interface";
import { ApiOperation, ApiResponse, ApiBody } from "@nestjs/swagger";
import { AuthRequest } from "@/shared/interfaces/request.interface";
import {
	EscalateTicketDto,
	AssignTicketDto,
	StartAnalysisDto,
	StartRespondingDto,
	ResolveTicketDto,
	CloseTicketDto,
} from "./dto/update-ticket.dto";
import { AuthGuard } from "@/shared/guards/auth.guard";
import { Role } from "../users/enums/role.enum";
import { Roles } from "@/shared/decorators/role.decorator";
import { RoleGuard } from "@/shared/guards/roles.guard";
import { GetTicketDto } from "./dto/get-ticket.dto";

@UseGuards(AuthGuard)
@Controller("tickets")
export class TicketsController {
	constructor(private readonly ticketsService: TicketsService) {}

	@ApiOperation({ summary: "Create a new ticket" })
	@ApiResponse({ status: 201, description: "Ticket created successfully" })
	@Post()
	async createTicket(
		@Body() createTicketDto: CreateTicketDto,
		@Req() req: AuthRequest,
	): Promise<{ message: string; data: ITicket }> {
		const data = await this.ticketsService.createTicket({
			...createTicketDto,
			createdById: req.user.id,
		});
		return {
			message: "Ticket created successfully",
			data,
		};
	}

	@ApiOperation({ summary: "Get a ticket by id" })
	@ApiResponse({ status: 200, description: "Ticket fetched successfully" })
	@Get(":ticketId")
	async getTicketById(
		@Param("ticketId") ticketId: string,
	): Promise<{ message: string; data: ITicket }> {
		const data = await this.ticketsService.getTicketById(ticketId);
		return {
			message: "Ticket fetched successfully",
			data,
		};
	}

	@ApiOperation({ summary: "Get all tickets" })
	@ApiResponse({ status: 200, description: "Tickets fetched successfully" })
	@Get()
	async getTickets(@Query() query: GetTicketDto): Promise<{ message: string; data: ITicketSummary[] }> {
		const data = await this.ticketsService.getTickets(query);
		return {
			message: "Tickets fetched successfully",
			...data,
		};
	}

	@ApiOperation({ summary: "Get a ticket life cycle by id" })
	@ApiResponse({
		status: 200,
		description: "Ticket life cycle fetched successfully",
	})
	@Get(":ticketId/lifecycle")
	async getTicketLifecycle(@Param("ticketId") ticketId: string): Promise<{
		message: string;
		data: ITicketLifecycle[];
	}> {
		const data = await this.ticketsService.getTicketLifecycle(ticketId);
		return {
			message: "Ticket life cycle fetched successfully",
			data,
		};
	}

	@ApiOperation({ summary: "Escalate a ticket" })
	@ApiResponse({ status: 200, description: "Ticket escalated" })
	@ApiBody({ type: EscalateTicketDto })
	@Patch(":ticketId/escalate")
	async escalateTicket(
		@Param("ticketId") ticketId: string,
		@Body() body: EscalateTicketDto,
		@Req() req: AuthRequest,
	) {
		await this.ticketsService.escalateTicket(
			ticketId,
			req.user.id,
			body.escalationReason,
		);
		return { message: "Ticket escalated successfully" };
	}

	@ApiOperation({ summary: "Assign a responder to a ticket" })
	@ApiResponse({ status: 200, description: "Ticket assigned" })
	@ApiBody({ type: AssignTicketDto })
	@Roles(Role.RESPONDER_ADMIN, Role.SUPER_ADMIN)
	@Patch(":ticketId/assign")
	async assignTicket(
		@Param("ticketId") ticketId: string,
		@Body() body: AssignTicketDto,
		@Req() req: AuthRequest,
	) {
		await this.ticketsService.assignTicket(ticketId, req.user.id, body);
		return { message: "Ticket assigned successfulyy" };
	}

	@ApiOperation({
		summary: "Reassign a responder to a ticket after escalation",
	})
	@ApiResponse({ status: 200, description: "Ticket assigned" })
	@ApiBody({ type: AssignTicketDto })
	@Roles(Role.RESPONDER_ADMIN, Role.SUPER_ADMIN)
	@Patch(":ticketId/reAssign")
	async reAssignTicket(
		@Param("ticketId") ticketId: string,
		@Body() body: AssignTicketDto,
		@Req() req: AuthRequest,
	) {
		await this.ticketsService.reassignTicket(ticketId, req.user.id, body);
		return { message: "Ticket reassigned successfully" };
	}

	@ApiOperation({ summary: "Start analysing a ticket" })
	@ApiResponse({ status: 200, description: "Ticket moved to analysing" })
	@ApiBody({ type: StartAnalysisDto })
	@UseGuards(RoleGuard)
	@Roles(Role.RESPONDER_ADMIN, Role.SUPER_ADMIN)
	@Patch(":ticketId/start-analysis")
	async startAnalysis(
		@Param("ticketId") ticketId: string,
		@Body() body: StartAnalysisDto,
		@Req() req: AuthRequest,
	) {
		await this.ticketsService.startAnalysingTicket(
			ticketId,
			req.user.id,
			body.notes,
		);
		return { message: "Ticket moved to analysing" };
	}

	@ApiOperation({ summary: "Start responding to a ticket" })
	@ApiResponse({ status: 200, description: "Ticket moved to responding" })
	@ApiBody({ type: StartRespondingDto })
	@Patch(":ticketId/start-responding")
	async startResponding(
		@Param("ticketId") ticketId: string,
		@Body() body: StartRespondingDto,
		@Req() req: AuthRequest,
	) {
		await this.ticketsService.startRespondingToTicket(
			ticketId,
			req.user.id,
			body.notes,
		);
		return { message: "Ticket moved to responding" };
	}

	@ApiOperation({ summary: "Resolve a ticket" })
	@ApiResponse({ status: 200, description: "Ticket resolved" })
	@ApiBody({ type: ResolveTicketDto })
	@Patch(":ticketId/resolve")
	async resolveTicket(
		@Param("ticketId") ticketId: string,
		@Body() body: ResolveTicketDto,
		@Req() req: AuthRequest,
	) {
		await this.ticketsService.resolveTicket(
			ticketId,
			req.user.id,
			body.notes,
		);
		return { message: "Ticket resolved" };
	}

	@ApiOperation({ summary: "Close a ticket" })
	@ApiResponse({ status: 200, description: "Ticket closed" })
	@ApiBody({ type: CloseTicketDto })
	@Patch(":ticketId/close")
	async closeTicket(
		@Param("ticketId") ticketId: string,
		@Body() body: CloseTicketDto,
		@Req() req: AuthRequest,
	) {
		await this.ticketsService.closeTicket(
			ticketId,
			req.user.id,
			body.notes,
		);
		return { message: "Ticket closed" };
	}
}
