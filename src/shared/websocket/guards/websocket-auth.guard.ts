import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { WsException } from "@nestjs/websockets";
import { Socket } from "socket.io";
import { JwtService } from "@nestjs/jwt";

interface JwtPayload {
	sub: string;
	username?: string;
	email?: string;
	role?: string;
	userType?: string;
}

@Injectable()
export class WebSocketAuthGuard implements CanActivate {
	constructor(private jwtService: JwtService) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		try {
			const client: Socket = context.switchToWs().getClient();
			const token = this.extractTokenFromHeader(client);

			if (!token) {
				throw new WsException("Unauthorized access");
			}

			// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
			const payload = (await this.jwtService.verifyAsync(token, {
				secret: process.env.JWT_SECRET,
			})) as JwtPayload;

			// Attach user data to socket
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
			client.data.user = {
				userId: payload.sub,
				userName: payload.username || payload.email,
				role: payload.role,
			};
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
			client.data.userType = payload.userType || "user";

			return true;
		} catch {
			throw new WsException("Unauthorized access");
		}
	}

	private extractTokenFromHeader(client: Socket): string | undefined {
		const authHeader = client.handshake.headers.authorization;
		if (authHeader && typeof authHeader === "string") {
			const [type, token] = authHeader.split(" ");
			return type === "Bearer" ? token : undefined;
		}
		return undefined;
	}
}
