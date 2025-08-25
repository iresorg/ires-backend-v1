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
import { CloudinaryModule } from "./modules/cloudinary/module";

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
			validate: validateEnv,
		}),
		DatabaseModule,
		JwtProviderModule,
		AuthModule,
		UsersModule,
		UtilsModule,
		AsyncContextModule,
		LoggerModule,
		EmailModule,
		QueueModule,
		TicketsModule,
		TicketCategoriesModule,
		AgentsModule,
		RespondersModule,
		CloudinaryModule,
	],
})
export class AppModule implements NestModule {
	constructor(private readonly logger: Logger) {}
	configure(consumer: MiddlewareConsumer) {
		consumer.apply(AsyncContextMiddleware).forRoutes("*");
		consumer.apply(this.logger.logRequestSummary()).forRoutes("*");
	}
}
