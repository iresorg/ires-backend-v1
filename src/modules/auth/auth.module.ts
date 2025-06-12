import { Module } from "@nestjs/common";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { UsersModule } from "../users/users.module";
import { UtilsModule } from "@/utils/utils.module";
import { JwtProviderModule } from "@/shared/jwt.module";
import { JwtStrategy } from "@/shared/strategies/jwt.strategy";

@Module({
	imports: [UtilsModule, UsersModule, JwtProviderModule],
	controllers: [AuthController],
	providers: [AuthService, JwtStrategy],
	exports: [AuthService, JwtStrategy],
})
export class AuthModule {}
