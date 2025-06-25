import { Module } from "@nestjs/common";
import { EmailConsumer } from "./consumers/email.consumer";
import { QueueService } from "./service";
import { AgentStatusConsumer } from "./consumers/agent-status.consumer";
import { AgentsModule } from "@/modules/agents/agents.module";

@Module({
	imports: [AgentsModule],
	providers: [QueueService, EmailConsumer, AgentStatusConsumer],
	exports: [QueueService, EmailConsumer],
})
export class QueueModule {}
