import {
	CanActivate,
	ExecutionContext,
	Injectable,
	UnauthorizedException,
} from "@nestjs/common";
import { Request } from "express";
import { Utils } from "@/utils/utils";
import { AccountsRepository } from "@/modules/accounts/repository/accounts.repository";

@Injectable()
export class AccountsAuthGuard implements CanActivate {
	constructor(
		private readonly utils: Utils,
		private readonly accountsRepo: AccountsRepository,
	) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const request = context
			.switchToHttp()
			.getRequest<Request & { user?: any }>();
		const token = this.extractTokenFromHeader(request);
		if (!token)
			throw new UnauthorizedException("Token not found in header");

		const payload = this.utils.verifyJWT<any>(token);
		if (!payload || payload.aud !== "portal") {
			throw new UnauthorizedException("Invalid token audience");
		}

		const account = await this.accountsRepo.findById(payload.id);
		if (!account) throw new UnauthorizedException("Account not found");

		request.user = {
			id: account.id,
			email: account.email,
			role: account.role,
			type: "account",
		};
		return true;
	}

	private extractTokenFromHeader(request: Request): string | null {
		const [type, token] = request.headers.authorization?.split(" ") ?? [];
		return type === "Bearer" ? token : null;
	}
}
