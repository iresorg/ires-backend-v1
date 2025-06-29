import {
	MiddlewareConsumer,
	Module,
	NestModule,
	OnModuleInit,
	Inject,
} from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { AuthModule } from "./modules/auth/auth.module";
import { UsersModule } from "./modules/users/users.module";
import { validateEnv } from "./utils/env.validate";
import { UtilsModule } from "./utils/utils.module";
import { JwtProviderModule } from "./shared/jwt.module";
import { DatabaseModule } from "./shared/database/datasource";
import { AgentsModule } from "./modules/agents/agents.module";
import { RespondersModule } from "./modules/responders/responders.module";
import { AsyncContextMiddleware } from "./shared/async-context/middleware";
import { AsyncContextModule } from "./shared/async-context/module";
import { LoggerModule } from "./shared/logger/module";
import { Logger } from "./shared/logger/service";
import { QueueModule } from "./shared/queue/module";
import { EmailModule } from "./shared/email/module";
import { TokenEncryption } from "./shared/utils/token-encryption.util";
import { EnvVariables } from "./utils/env.validate";

class TokenEncryptionInitializer implements OnModuleInit {
	constructor(
		@Inject(ConfigService)
		private readonly configService: ConfigService<EnvVariables>,
	) {}

	onModuleInit() {
		try {
			TokenEncryption.initialize(this.configService);
			console.log("Token encryption service initialized successfully");
		} catch (error) {
			console.error(
				"Failed to initialize token encryption service. Ensure TOKEN_ENCRYPTION_KEY is properly set in environment variables.",
				error,
			);
			throw error;
		}
	}
}

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
		AgentsModule,
		RespondersModule,
		AsyncContextModule,
		LoggerModule,
		EmailModule,
		QueueModule,
	],
	providers: [TokenEncryptionInitializer],
})
export class AppModule implements NestModule {
	constructor(private readonly logger: Logger) {}
	configure(consumer: MiddlewareConsumer) {
		consumer.apply(AsyncContextMiddleware).forRoutes("*");
		consumer.apply(this.logger.logRequestSummary()).forRoutes("*");
	}
}
