import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { UsersModule } from "../users/users.module";
import { UtilsModule } from "@/utils/utils.module";
import { JwtProviderModule } from "@/shared/jwt.module";
import { JwtStrategy } from "@/shared/strategies/jwt.strategy";
import { EmailModule } from "@/shared/email/module";
import { UserPasswordReset } from "./entities/user-password-reset.entity";

@Module({
	imports: [
		UtilsModule,
		UsersModule,
		JwtProviderModule,
		EmailModule,
		TypeOrmModule.forFeature([UserPasswordReset]),
	],
	controllers: [AuthController],
	providers: [AuthService, JwtStrategy],
	exports: [AuthService, JwtStrategy],
})
export class AuthModule {}
