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
import { AgentsService } from "@/modules/agents/agents.service";
import { RespondersService } from "@/modules/responders/responders.service";

@Injectable()
export class AuthGuard implements CanActivate {
	constructor(
		private readonly utils: Utils,
		private reflector: Reflector,
		private readonly asyncContextService: AsyncContextService,
		private readonly usersService: UsersService,
		private readonly agentsService: AgentsService,
		private readonly respondersService: RespondersService,
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

		if ("agentId" in payload) {
			// This is an agent token
			const agent = await this.agentsService.findOne(payload.agentId);
			if (!agent) {
				throw new UnauthorizedException("Agent not found");
			}
			request.user = { ...payload, type: "agent" };
			this.asyncContextService.set("agent", agent);
		} else if ("responderId" in payload) {
			// This is a responder token
			const responder = await this.respondersService.findOne(
				payload.responderId,
			);
			if (!responder) {
				throw new UnauthorizedException("Responder not found");
			}
			request.user = payload;
			this.asyncContextService.set("responder", responder);
		} else {
			// This is a user token
			const user = await this.usersService.findOne({ id: payload.id });
			if (!user) {
				throw new UnauthorizedException("User not found");
			}
			request.user = { ...payload, type: "user" };
			this.asyncContextService.set("user", user);
		}

		return true;
	}

	private extractTokenFromHeader(request: Request): string | null {
		const [type, token] = request.headers.authorization?.split(" ") ?? [];
		return type === "Bearer" ? token : null;
	}
}
