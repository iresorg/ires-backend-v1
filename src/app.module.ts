import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AuthModule } from "./modules/auth/auth.module";
import { UsersModule } from "./modules/users/users.module";
import { validateEnv } from "./utils/env.validate";
import { UtilsModule } from "./utils/utils.module";
import { JwtProviderModule } from "./shared/jwt.module";
import { DatabaseModule } from "./shared/database/datasource";
import { AgentsModule } from "./modules/agents/agents.module";

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
	],
})
export class AppModule {}