import { AuthPayload } from "@/modules/auth/interfaces/auth";
import { Utils } from "@/utils/utils";
import {
	CanActivate,
	ExecutionContext,
	Injectable,
	UnauthorizedException,
} from "@nestjs/common";
import { Request } from "express";
import { AuthRequest } from "../interfaces/request.interface";
import { Reflector } from "@nestjs/core";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";
import { AsyncContextService } from "../async-context/service";
import { UsersService } from "@/modules/users/users.service";

@Injectable()
export class AuthGuard implements CanActivate {
	constructor(
		private readonly utils: Utils,
		private reflector: Reflector,
		private readonly asyncContextService: AsyncContextService,
		private readonly usersService: UsersService,
	) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const isPublic = this.reflector.getAllAndOverride<boolean>(
			IS_PUBLIC_KEY,
			[context.getHandler(), context.getClass()],
		);

		if (isPublic) return true;

		const request = context.switchToHttp().getRequest<AuthRequest>();

		const token = this.extractTokenFromHeader(request);

		if (!token) {
			throw new UnauthorizedException("Token not found in header");
		}

		const payload = this.utils.verifyJWT<AuthPayload>(token);

		// This is a user token
		const user = await this.usersService.findOne({ id: payload.id });
		if (!user) {
			throw new UnauthorizedException("User not found");
		}

		// Set the user object with all required fields
		request.user = {
			id: user.id,
			email: user.email,
			role: user.role,
			type: "user",
		};
		this.asyncContextService.set("user", user);

		return true;
	}

	private extractTokenFromHeader(request: Request): string | null {
		const [type, token] = request.headers.authorization?.split(" ") ?? [];
		return type === "Bearer" ? token : null;
	}
}
