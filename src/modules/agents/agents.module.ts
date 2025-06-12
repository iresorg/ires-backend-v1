import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Agent } from "@agents/entities/agent.entity";
import { AgentToken } from "@agents/entities/agent-token.entity";
import { AgentsService } from "@agents/agents.service";
import { AgentsController } from "@agents/agents.controller";
import { AgentRepository } from "@agents/repositories/agent.repository";
import { AgentTokenRepository } from "@agents/repositories/agent.repository";
import constants from "./constants/constants";

@Module({
	imports: [TypeOrmModule.forFeature([Agent, AgentToken])],
	controllers: [AgentsController],
	providers: [
		AgentsService,
		{
			provide: constants.AGENT_REPOSITORY,
			useClass: AgentRepository,
		},
		{
			provide: constants.AGENT_TOKEN_REPOSITORY,
			useClass: AgentTokenRepository,
		},
	],
	exports: [AgentsService],
})
export class AgentsModule {}
