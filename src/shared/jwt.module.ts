import { Global, Module } from "@nestjs/common";
import { EnvVariables } from "@/utils/env.validate";
import { ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";

@Global()
@Module({
	imports: [
		JwtModule.registerAsync({
			global: true,
			useFactory: (env: ConfigService<EnvVariables>) => {
				return {
					secret: env.get("JWT_TOKEN_SECRET"),
				};
			},
			inject: [ConfigService],
		}),
	],
})
export class JwtProviderModule {}
