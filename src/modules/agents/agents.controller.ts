/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
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
import { Roles } from "@/shared/decorators/role.decorator";
import { Role } from "@users/enums/role.enum";
import { UpdateAgentStatusDto } from "./dto/update-agent-status.dto";
import { GenerateTokenDto } from "./dto/generate-token.dto";
import {
	ApiBearerAuth,
	ApiTags,
	ApiOperation,
	ApiResponse,
} from "@nestjs/swagger";
import { AgentResponseDto } from "./dto/agent-response.dto";
import { IAgent } from "./interfaces/agent.interface";

@ApiTags("Agents")
@ApiBearerAuth()
@Controller("agents")
@UseGuards(JwtAuthGuard, RoleGuard)
export class AgentsController {
	constructor(private readonly agentsService: AgentsService) {}

	@Post()
	@Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.AGENT_ADMIN)
	@ApiOperation({ summary: "Create a new agent" })
	@ApiResponse({
		status: 201,
		description: "Agent created successfully",
		type: AgentResponseDto,
	})
	async create(): Promise<{ message: string; data: AgentResponseDto }> {
		const agent: IAgent = await this.agentsService.create();

		const data = AgentResponseDto.fromAgent(agent);
		return {
			message: "Agent created successfully",
			data,
		};
	}

	@Get()
	@Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.AGENT_ADMIN)
	@ApiOperation({ summary: "Get all agents" })
	@ApiResponse({
		status: 200,
		description: "List of all agents",
		type: [AgentResponseDto],
	})
	async findAll(): Promise<{ message: string; data: AgentResponseDto[] }> {
		const agents = await this.agentsService.findAll();
		return {
			message: "Agents fetched successfully",
			data: agents.map((agent) => AgentResponseDto.fromAgent(agent)),
		};
	}

	@Get("active")
	@Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.AGENT_ADMIN)
	@ApiOperation({ summary: "Get all active agents" })
	@ApiResponse({
		status: 200,
		description: "List of active agents",
		type: [AgentResponseDto],
	})
	async findActiveAgents(): Promise<{
		message: string;
		data: AgentResponseDto[];
	}> {
		const agents = await this.agentsService.findActiveAgents();
		return {
			message: "Active agents fetched successfully",
			data: agents.map((agent) => AgentResponseDto.fromAgent(agent)),
		};
	}

	@Get(":id")
	@Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.AGENT_ADMIN)
	@ApiOperation({ summary: "Get agent by ID" })
	@ApiResponse({
		status: 200,
		description: "Agent details",
		type: AgentResponseDto,
	})
	async findOne(
		@Param("id") id: string,
	): Promise<{ message: string; data: AgentResponseDto }> {
		const agent = await this.agentsService.findOne(id);
		const response = AgentResponseDto.fromAgent(agent);
		return {
			message: "Agent fetched successfully",
			data: response,
		};
	}

	@Put(":id/status")
	@Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.AGENT_ADMIN)
	@ApiOperation({ summary: "Update agent status" })
	@ApiResponse({
		status: 200,
		description: "Agent status updated successfully",
		type: AgentResponseDto,
	})
	async updateStatus(
		@Param("id") id: string,
		@Body() updateStatusDto: UpdateAgentStatusDto,
	): Promise<{ message: string; data: AgentResponseDto }> {
		const agent = await this.agentsService.updateStatus(
			id,
			updateStatusDto,
		);
		const response = AgentResponseDto.fromAgent(agent);
		return {
			message: "Agent status updated successfully",
			data: response,
		};
	}

	@Post(":id/token")
	@Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.AGENT_ADMIN)
	@ApiOperation({ summary: "Generate agent token" })
	@ApiResponse({
		status: 201,
		description: "Agent token generated successfully",
	})
	async generateToken(
		@Param("id") id: string,
		@Body() generateTokenDto: GenerateTokenDto,
	): Promise<{ message: string; token: string }> {
		const token = await this.agentsService.generateToken(
			id,
			generateTokenDto,
		);
		return {
			message: "Agent token generated successfully",
			token,
		};
	}

	@Post(":id/token/revoke")
	@Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.AGENT_ADMIN)
	@ApiOperation({ summary: "Revoke agent token" })
	@ApiResponse({
		status: 200,
		description: "Agent token revoked successfully",
	})
	async revokeToken(@Param("id") id: string): Promise<{ message: string }> {
		await this.agentsService.revokeToken(id);
		return {
			message: "Agent token revoked successfully",
		};
	}

	@Get(":id/token")
	@Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.AGENT_ADMIN)
	@ApiOperation({ summary: "Get agent token" })
	@ApiResponse({
		status: 200,
		description: "Agent token retrieved successfully",
		type: String,
	})
	async getToken(@Param("id") id: string): Promise<{ token: string | null }> {
		const token = await this.agentsService.getToken(id);
		return { token };
	}
}
