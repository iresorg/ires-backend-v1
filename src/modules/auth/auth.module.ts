import { Module } from "@nestjs/common";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { UsersModule } from "../users/users.module";
import { AgentsModule } from "../agents/agents.module";
import { RespondersModule } from "../responders/responders.module";
import { UtilsModule } from "@/utils/utils.module";
import { JwtProviderModule } from "@/shared/jwt.module";
import { JwtStrategy } from "@/shared/strategies/jwt.strategy";
import { EmailModule } from "@/shared/email/module";

@Module({
	imports: [
		UtilsModule,
		UsersModule,
		AgentsModule,
		RespondersModule,
		JwtProviderModule,
		EmailModule,
	],
	controllers: [AuthController],
	providers: [AuthService, JwtStrategy],
	exports: [AuthService, JwtStrategy],
})
export class AuthModule {}
