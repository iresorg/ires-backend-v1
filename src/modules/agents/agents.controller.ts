import {
	Controller,
	Get,
	Post,
	Body,
	Param,
	Put,
	UseGuards,
} from '@nestjs/common';
import { AgentsService } from './agents.service';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { RolesGuard } from '@auth/guards/roles.guard';
import { Roles } from '@auth/decorators/roles.decorator';
import { Role } from '@users/enums/role.enum';
import { CreateAgentDto } from './dto/create-agent.dto';
import { UpdateAgentStatusDto } from './dto/update-agent-status.dto';
import { GenerateTokenDto } from './dto/generate-token.dto';

@Controller('agents')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AgentsController {
	constructor(private readonly agentsService: AgentsService) {}

	@Post()
	@Roles(Role.ADMIN, Role.MANAGER)
	async create(@Body() createAgentDto: CreateAgentDto) {
		return this.agentsService.create(createAgentDto);
	}

	@Get()
	@Roles(Role.ADMIN, Role.MANAGER)
	async findAll() {
		return this.agentsService.findAll();
	}

	@Get('active')
	@Roles(Role.ADMIN, Role.MANAGER)
	async findActiveAgents() {
		return this.agentsService.findActiveAgents();
	}

	@Get(':id')
	@Roles(Role.ADMIN, Role.MANAGER)
	async findOne(@Param('id') id: string) {
		return this.agentsService.findOne(id);
	}

	@Put(':id/status')
	@Roles(Role.ADMIN, Role.MANAGER)
	async updateStatus(
		@Param('id') id: string,
		@Body() updateStatusDto: UpdateAgentStatusDto,
	) {
		return this.agentsService.updateStatus(id, updateStatusDto);
	}

	@Post(':id/token')
	@Roles(Role.ADMIN, Role.MANAGER)
	async generateToken(
		@Param('id') id: string,
		@Body() generateTokenDto: GenerateTokenDto,
	) {
		return this.agentsService.generateToken(id, generateTokenDto);
	}

	@Post(':id/token/revoke')
	@Roles(Role.ADMIN, Role.MANAGER)
	async revokeToken(@Param('id') id: string) {
		return this.agentsService.revokeToken(id);
	}
}
