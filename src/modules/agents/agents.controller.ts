import {
	Controller,
	Get,
	Post,
	Body,
	Param,
	Put,
	UseGuards,
} from "@nestjs/common";
import { AgentsService } from "./agents.service";
import { JwtAuthGuard } from "@auth/guards/jwt-auth.guard";
import { RoleGuard } from "@/shared/guards/roles.guard";
import { Roles } from "@auth/decorators/roles.decorator";
import { Role } from "@users/enums/role.enum";
import { CreateAgentDto } from "./dto/create-agent.dto";
import { UpdateAgentStatusDto } from "./dto/update-agent-status.dto";
import { GenerateTokenDto } from "./dto/generate-token.dto";

@Controller("agents")
@UseGuards(JwtAuthGuard, RoleGuard)
export class AgentsController {
	constructor(private readonly agentsService: AgentsService) {}

	@Post()
	@Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.AGENT_ADMIN)
	async create(@Body() createAgentDto: CreateAgentDto) {
		return this.agentsService.create(createAgentDto);
	}

	@Get()
	@Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.AGENT_ADMIN)
	async findAll() {
		return this.agentsService.findAll();
	}

	@Get("active")
	@Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.AGENT_ADMIN)
	async findActiveAgents() {
		return this.agentsService.findActiveAgents();
	}

	@Get(":id")
	@Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.AGENT_ADMIN)
	async findOne(@Param("id") id: string) {
		return this.agentsService.findOne(id);
	}

	@Put(":id/status")
	@Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.AGENT_ADMIN)
	async updateStatus(
		@Param("id") id: string,
		@Body() updateStatusDto: UpdateAgentStatusDto,
	) {
		return this.agentsService.updateStatus(id, updateStatusDto);
	}

	@Post(":id/token")
	@Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.AGENT_ADMIN)
	async generateToken(
		@Param("id") id: string,
		@Body() generateTokenDto: GenerateTokenDto,
	) {
		return this.agentsService.generateToken(id, generateTokenDto);
	}

	@Post(":id/token/revoke")
	@Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.AGENT_ADMIN)
	async revokeToken(@Param("id") id: string) {
		return this.agentsService.revokeToken(id);
	}
}
