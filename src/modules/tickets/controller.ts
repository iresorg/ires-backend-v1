import {
	Body,
	Controller,
	Get,
	Param,
	Post,
	Req,
	Patch,
	UseGuards,
} from "@nestjs/common";
import { TicketsService } from "./service";
import { CreateTicketDto } from "./dto/create-ticket.dto";
import {
	ITicket,
	ITicketLifecycle,
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

@UseGuards(AuthGuard)
@Controller("tickets")
export class TicketsController {
	constructor(private readonly ticketsService: TicketsService) {}

	@ApiOperation({ summary: "Create a new ticket" })
	@ApiResponse({ status: 201, description: "Ticket created successfully" })
	@Post("/:actorType(responder|agent|admin)")
	async createTicket(
		@Body() createTicketDto: CreateTicketDto,
		@Req() req: AuthRequest,
		@Param("actorType") actorType: "responder" | "agent" | "admin",
	): Promise<{ message: string; data: ITicket }> {
		const data = await this.ticketsService.createTicket({
			...createTicketDto,
			actorId: req.user.id,
			actorType,
			creatorRole: req.user.role,
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
	): Promise<{ message: string; data: ITicket }> {
		const updated = await this.ticketsService.updateTicket(
			TicketStatus.ESCALATED,
			ticketId,
			{ status: TicketStatus.ESCALATED },
			req.user.id,
			req.user.role,
			{
				escalationReason: body.escalationReason,
				escalatedToUserId: body.escalatedToUserId,
				notes: body.notes,
			},
		);
		return { message: "Ticket escalated", data: updated };
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
	): Promise<{ message: string; data: ITicket }> {
		const updated = await this.ticketsService.updateTicket(
			TicketStatus.ASSIGNED,
			ticketId,
			{
				status: TicketStatus.ASSIGNED,
				tier: body.tier,
				severity: body.severity,
			},
			req.user.id,
			req.user.role,
			{
				assignedResponderId: body.assignedResponderId,
				notes: body.notes,
			},
		);
		return { message: "Ticket assigned", data: updated };
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
	): Promise<{ message: string; data: ITicket }> {
		const updated = await this.ticketsService.updateTicket(
			TicketStatus.ANALYSING,
			ticketId,
			{ status: TicketStatus.ANALYSING },
			req.user.id,
			req.user.role,
			{ notes: body.notes },
		);
		return { message: "Ticket moved to analysing", data: updated };
	}

	@ApiOperation({ summary: "Start responding to a ticket" })
	@ApiResponse({ status: 200, description: "Ticket moved to responding" })
	@ApiBody({ type: StartRespondingDto })
	@Patch(":ticketId/start-responding")
	async startResponding(
		@Param("ticketId") ticketId: string,
		@Body() body: StartRespondingDto,
		@Req() req: AuthRequest,
	): Promise<{ message: string; data: ITicket }> {
		const updated = await this.ticketsService.updateTicket(
			TicketStatus.RESPONDING,
			ticketId,
			{ status: TicketStatus.RESPONDING },
			req.user.id,
			req.user.role,
			{ notes: body.notes },
		);
		return { message: "Ticket moved to responding", data: updated };
	}

	@ApiOperation({ summary: "Resolve a ticket" })
	@ApiResponse({ status: 200, description: "Ticket resolved" })
	@ApiBody({ type: ResolveTicketDto })
	@Patch(":ticketId/resolve")
	async resolveTicket(
		@Param("ticketId") ticketId: string,
		@Body() body: ResolveTicketDto,
		@Req() req: AuthRequest,
	): Promise<{ message: string; data: ITicket }> {
		const updated = await this.ticketsService.updateTicket(
			TicketStatus.RESOLVED,
			ticketId,
			{ status: TicketStatus.RESOLVED },
			req.user.id,
			req.user.role,
			{ notes: body.notes },
		);
		return { message: "Ticket resolved", data: updated };
	}

	@ApiOperation({ summary: "Close a ticket" })
	@ApiResponse({ status: 200, description: "Ticket closed" })
	@ApiBody({ type: CloseTicketDto })
	@Patch(":ticketId/close")
	async closeTicket(
		@Param("ticketId") ticketId: string,
		@Body() body: CloseTicketDto,
		@Req() req: AuthRequest,
	): Promise<{ message: string; data: ITicket }> {
		const updated = await this.ticketsService.updateTicket(
			TicketStatus.CLOSED,
			ticketId,
			{ status: TicketStatus.CLOSED },
			req.user.id,
			req.user.role,
			{ notes: body.notes },
		);
		return { message: "Ticket closed", data: updated };
	}
}
