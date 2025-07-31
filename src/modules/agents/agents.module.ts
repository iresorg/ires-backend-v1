import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Agent } from './entities/agent.entity';
import { AgentToken } from './entities/agent-token.entity';
import { AgentsService } from './agents.service';
import { AgentsController } from './agents.controller';
import {
	AgentRepository,
	AgentTokenRepository,
} from './repositories/agent.repository';

@Module({
	imports: [TypeOrmModule.forFeature([Agent, AgentToken])],
	controllers: [AgentsController],
	providers: [AgentsService, AgentRepository, AgentTokenRepository],
	exports: [AgentsService],
})
export class AgentsModule {}
