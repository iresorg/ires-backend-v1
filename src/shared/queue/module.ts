import { Module } from "@nestjs/common";
import { EmailConsumer } from "./consumers/email.consumer";
import { QueueService } from "./service";

@Module({
	providers: [QueueService, EmailConsumer],
	exports: [EmailConsumer],
})
export class QueueModule {}
