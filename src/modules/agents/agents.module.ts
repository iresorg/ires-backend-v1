import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Agent } from "@agents/entities/agent.entity";
import { AgentToken } from "@agents/entities/agent-token.entity";
import { AgentsService } from "@agents/agents.service";
import { AgentsController } from "@agents/agents.controller";
import {
	AgentRepository,
	AgentTokenRepository,
} from "@agents/repositories/agent.repository";

@Module({
	imports: [TypeOrmModule.forFeature([Agent, AgentToken])],
	controllers: [AgentsController],
	providers: [AgentsService, AgentRepository, AgentTokenRepository],
	exports: [AgentsService],
})
export class AgentsModule {}
