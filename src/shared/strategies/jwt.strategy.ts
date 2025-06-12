import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { ConfigService } from "@nestjs/config";
import { EnvVariables } from "@/utils/env.validate";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
	constructor(private configService: ConfigService<EnvVariables>) {
		super({
			jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
			ignoreExpiration: false,
			secretOrKey: configService.get("JWT_TOKEN_SECRET"),
		});
	}

	validate(payload: any) {
		return payload;
	}
}
