import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { ChatGateway } from "./gateways/chat.gateway";
import { WebSocketService } from "./services/websocket.service";
import { WebSocketAuthGuard } from "./guards/websocket-auth.guard";
import { WebSocketExceptionFilter } from "./filters/websocket-exception.filter";

@Module({
	imports: [
		JwtModule.register({
			secret: process.env.JWT_SECRET,
			signOptions: { expiresIn: "24h" },
		}),
	],
	providers: [
		ChatGateway,
		WebSocketService,
		WebSocketAuthGuard,
		WebSocketExceptionFilter,
	],
	exports: [WebSocketService, WebSocketAuthGuard, WebSocketExceptionFilter],
})
export class WebSocketModule {}
