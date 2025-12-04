import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { NewsletterController } from "./newsletter.controller";
import { NewsletterService } from "./newsletter.service";

@Module({
	imports: [ConfigModule],
	controllers: [NewsletterController],
	providers: [NewsletterService],
})
export class NewsletterModule {}
