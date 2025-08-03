import { Module } from "@nestjs/common";
import { EmailConsumer } from "./consumers/email.consumer";
import { QueueService } from "./service";
import { LoggerModule } from "@/shared/logger/module";

@Module({
	imports: [LoggerModule],
	providers: [QueueService, EmailConsumer],
	exports: [QueueService, EmailConsumer],
})
export class QueueModule {}
