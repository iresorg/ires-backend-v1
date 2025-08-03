import { Module } from "@nestjs/common";
import { QueueModule } from "../queue/module";
import { EmailService } from "./service";

@Module({
	imports: [QueueModule],
	providers: [EmailService],
	exports: [EmailService],
})
export class EmailModule {}
