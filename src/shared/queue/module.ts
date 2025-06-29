import { Module, forwardRef } from "@nestjs/common";
import { EmailConsumer } from "./consumers/email.consumer";
import { QueueService } from "./service";
import { AgentStatusConsumer } from "./consumers/agent-status.consumer";
import { ResponderStatusConsumer } from "./consumers/responder-status.consumer";
import { AgentsModule } from "@/modules/agents/agents.module";
import { RespondersModule } from "@/modules/responders/responders.module";
import { LoggerModule } from "@/shared/logger/module";

@Module({
	imports: [
		forwardRef(() => AgentsModule),
		forwardRef(() => RespondersModule),
		LoggerModule,
	],
	providers: [
		QueueService,
		AgentStatusConsumer,
		ResponderStatusConsumer,
		EmailConsumer,
	],
	exports: [QueueService, EmailConsumer],
})
export class QueueModule {}
