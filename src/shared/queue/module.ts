import { Module } from "@nestjs/common";
import { QueueService } from "./service";
import { EmailConsumer } from "./consumers/email.consumer";
import { AgentStatusConsumer } from "./consumers/agent-status.consumer";
import { AgentsModule } from "@/modules/agents/agents.module";

@Module({
	imports: [AgentsModule],
	providers: [QueueService, EmailConsumer, AgentStatusConsumer],
	exports: [QueueService],
})
export class QueueModule {}
