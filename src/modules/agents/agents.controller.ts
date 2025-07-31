import {
	Controller,
	Post,
	Body,
	Req,
	UseGuards,
	ForbiddenException,
	Get,
	Query,
	Param,
	Put,
	Delete,
	Patch,
	NotFoundException,
} from "@nestjs/common";
import { AgentsService } from "./agents.service";
import { CreateAgentDto } from "./dto/create-agent.dto";
import { AuthRequest } from "@/shared/interfaces/request.interface";
import { AuthGuard } from "@/shared/guards/auth.guard";
import { RoleGuard } from "@/shared/guards/roles.guard";
import { Roles } from "@/shared/decorators/role.decorator";
import { Role } from "../users/enums/role.enum";
import { PaginationQuery } from "@/shared/dto/pagination.dto";
import { buildPaginationResult } from "@/shared/utils/pagination.util";
import { PaginationResult } from "@/shared/types/pagination-result.type";
import { UserResponseDto } from "../users/dto/user-response.dto";

@Controller("agents")
@UseGuards(AuthGuard, RoleGuard)
export class AgentsController {
	constructor(private readonly agentsService: AgentsService) {}

	@Post()
	@Roles(Role.SUPER_ADMIN, Role.AGENT_ADMIN)
	async createAgent(
		@Body() createAgentDto: CreateAgentDto,
	): Promise<{ message: string }> {
		// Only allow creation of AGENT role
		if (createAgentDto.role && createAgentDto.role !== Role.AGENT) {
			throw new ForbiddenException("Can only create agents");
		}
		await this.agentsService.createAgent({
			...createAgentDto,
			role: Role.AGENT,
		});
		return { message: "Agent created successfully" };
	}

	@Get()
	@Roles(Role.SUPER_ADMIN, Role.AGENT_ADMIN, Role.RESPONDER_ADMIN)
	async getAgents(
		@Query() pagination: PaginationQuery,
	): Promise<PaginationResult<UserResponseDto> | UserResponseDto[]> {
		// If search is provided, return all matching agents without pagination
		if (pagination.search) {
			const users = await this.agentsService.searchAgents(
				pagination.search,
			);
			return UserResponseDto.fromUsers(users);
		}

		// If no pagination parameters, return all agents
		if (!pagination.page && !pagination.limit) {
			const users = await this.agentsService.findAllAgents();
			return UserResponseDto.fromUsers(users);
		}

		// Otherwise, return paginated results
		const page = pagination.page ?? 1;
		const limit = pagination.limit ?? 10;
		const offset = (page - 1) * limit;
		const { users, total } = await this.agentsService.findAgentsPaginated(
			limit,
			offset,
		);
		const data = UserResponseDto.fromUsers(users);
		return buildPaginationResult(data, total, { page, limit });
	}

	@Get(":id")
	@Roles(Role.SUPER_ADMIN, Role.AGENT_ADMIN, Role.RESPONDER_ADMIN)
	async getAgentById(
		@Param("id") id: string,
	): Promise<{ message: string; data: UserResponseDto }> {
		const user = await this.agentsService.findAgentById(id);

		if (!user) {
			throw new NotFoundException("Agent not found");
		}

		return {
			message: "Agent fetched successfully",
			data: UserResponseDto.fromUser(user),
		};
	}

	@Put(":id")
	@Roles(Role.SUPER_ADMIN, Role.AGENT_ADMIN)
	async updateAgent(
		@Param("id") id: string,
		@Body() updateAgentDto: Partial<CreateAgentDto>,
	): Promise<{ message: string; data: UserResponseDto }> {
		const existingAgent = await this.agentsService.findAgentById(id);

		if (!existingAgent) {
			throw new NotFoundException("Agent not found");
		}

		// Prevent role escalation - agents can only be agents
		if (updateAgentDto.role && updateAgentDto.role !== Role.AGENT) {
			throw new ForbiddenException("Agents can only have AGENT role");
		}

		const agent = await this.agentsService.updateAgent(id, updateAgentDto);

		return {
			message: "Agent updated successfully",
			data: UserResponseDto.fromUser(agent),
		};
	}

	@Delete(":id")
	@Roles(Role.SUPER_ADMIN, Role.AGENT_ADMIN)
	async deleteAgent(@Param("id") id: string): Promise<{ message: string }> {
		const existingAgent = await this.agentsService.findAgentById(id);

		if (!existingAgent) {
			throw new NotFoundException("Agent not found");
		}

		await this.agentsService.deleteAgent(id);

		return {
			message: "Agent deleted successfully",
		};
	}

	@Patch(":id/activate")
	@Roles(Role.SUPER_ADMIN, Role.AGENT_ADMIN)
	async activateAgent(
		@Param("id") id: string,
		@Req() req: AuthRequest,
	): Promise<{ message: string; data: UserResponseDto }> {
		const { id: activatedBy, role: activatedByRole } = req.user;
		const existingAgent = await this.agentsService.findAgentById(id);

		if (!existingAgent) {
			throw new NotFoundException("Agent not found");
		}

		const agent = await this.agentsService.activateAgent(
			id,
			activatedBy,
			activatedByRole,
		);

		return {
			message: "Agent activated successfully",
			data: UserResponseDto.fromUser(agent),
		};
	}

	@Patch(":id/deactivate")
	@Roles(Role.SUPER_ADMIN, Role.AGENT_ADMIN)
	async deactivateAgent(
		@Param("id") id: string,
		@Req() req: AuthRequest,
	): Promise<{ message: string; data: UserResponseDto }> {
		const { id: deactivatedBy, role: deactivatedByRole } = req.user;
		const existingAgent = await this.agentsService.findAgentById(id);

		if (!existingAgent) {
			throw new NotFoundException("Agent not found");
		}

		const agent = await this.agentsService.deactivateAgent(
			id,
			deactivatedBy,
			deactivatedByRole,
		);

		return {
			message: "Agent deactivated successfully",
			data: UserResponseDto.fromUser(agent),
		};
	}
}
