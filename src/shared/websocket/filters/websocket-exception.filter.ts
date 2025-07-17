import { Catch, ArgumentsHost } from "@nestjs/common";
import { WsException } from "@nestjs/websockets";
import { Socket } from "socket.io";

@Catch(WsException)
export class WebSocketExceptionFilter {
	catch(exception: WsException, host: ArgumentsHost) {
		const client = host.switchToWs().getClient<Socket>();
		const error = exception.getError();
		const message = exception.message;

		client.emit("system:error", {
			message: typeof error === "string" ? error : message,
			code: "WS_ERROR",
		});
	}
}
