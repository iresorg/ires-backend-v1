import { Role } from "@/modules/users/enums/role.enum";
import {
	CanActivate,
	ExecutionContext,
	ForbiddenException,
	Injectable,
} from "@nestjs/common";
import { ROLES_KEY } from "../decorators/role.decorator";
import { AuthRequest } from "../interfaces/request.interface";
import { Reflector } from "@nestjs/core";

@Injectable()
export class RoleGuard implements CanActivate {
	constructor(private reflector: Reflector) {}

	canActivate(context: ExecutionContext): boolean {
		const requiredRoles = this.reflector.getAllAndOverride<Role[]>(
			ROLES_KEY,
			[context.getHandler(), context.getClass()],
		);

		if (!requiredRoles || requiredRoles.length === 0) return true;

		const request = context.switchToHttp().getRequest<AuthRequest>();

		const userRole = request.user.role;

		if (!requiredRoles.includes(userRole)) {
			throw new ForbiddenException(
				"Access denied. You are not authorized to access this resource",
			);
		}

		return true;
	}
}
