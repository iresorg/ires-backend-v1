import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { AuthModule } from "./modules/auth/auth.module";
import { UsersModule } from "./modules/users/users.module";
import { validateEnv } from "./utils/env.validate";
import { UtilsModule } from "./utils/utils.module";
import { JwtProviderModule } from "./shared/jwt.module";
import { DatabaseModule } from "./shared/database/datasource";
import { AsyncContextMiddleware } from "./shared/async-context/middleware";
import { AsyncContextModule } from "./shared/async-context/module";
import { LoggerModule } from "./shared/logger/module";
import { Logger } from "./shared/logger/service";
import { QueueModule } from "./shared/queue/module";
import { EmailModule } from "./shared/email/module";
// import { WebSocketModule } from "./shared/websocket/module";

import { TicketsModule } from "./modules/tickets/module";
import { TicketCategoriesModule } from "./modules/ticket-categories/ticket-categories.module";
import { AgentsModule } from "./modules/agents/agents.module";
import { RespondersModule } from "./modules/responders/responders.module";
import { FileUploadModule } from "./modules/file-upload/module";
import { AccountsModule } from "./modules/accounts/accounts.module";
import { SubscriptionsModule } from "./modules/subscriptions/subscriptions.module";
import { AdminModule } from "./modules/admin/admin.module";
import { NewsletterModule } from "./modules/newsletter/newsletter.module";
import { StartupSeederService } from "./shared/database/startup-seeder.service";
import { ScheduleModule } from "@nestjs/schedule";
import { KeepAliveModule } from "./shared/keep-alive/keep-alive.module";

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
			validate: validateEnv,
		}),
		ScheduleModule.forRoot(),
		DatabaseModule,
		JwtProviderModule,
		AuthModule,
		UsersModule,
		UtilsModule,
		AsyncContextModule,
		LoggerModule,
		EmailModule,
		QueueModule,
		AccountsModule,
		SubscriptionsModule,
		AdminModule,
		NewsletterModule,
		TicketsModule,
		TicketCategoriesModule,
		AgentsModule,
		RespondersModule,
		FileUploadModule,
		KeepAliveModule,
	],
	providers: [StartupSeederService],
})
export class AppModule implements NestModule {
	constructor(private readonly logger: Logger) {}
	configure(consumer: MiddlewareConsumer) {
		consumer.apply(AsyncContextMiddleware).forRoutes("*");
		consumer.apply(this.logger.logRequestSummary()).forRoutes("*");
	}
}
