import {
	Controller,
	Post,
	Body,
	Req,
	UseGuards,
	ForbiddenException,
	Get,
	Query,
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
		@Req() req: AuthRequest,
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
	): Promise<PaginationResult<UserResponseDto>> {
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
}
