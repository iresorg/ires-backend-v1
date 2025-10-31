import {
	Controller,
	Post,
	Headers,
	HttpCode,
	HttpStatus,
	Req,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { PaystackWebhookService } from "../services/paystack-webhook.service";

@ApiTags("Webhooks")
@Controller("webhooks")
export class WebhooksController {
	constructor(private readonly webhookService: PaystackWebhookService) {}

	@Post("paystack")
	@HttpCode(HttpStatus.OK)
	@ApiOperation({
		summary: "Paystack webhook handler",
		description:
			"Receives and processes Paystack webhook events for subscriptions and payments",
	})
	@ApiResponse({
		status: 200,
		description: "Webhook processed successfully",
	})
	async handlePaystackWebhook(
		@Req() req: any,
		@Headers("x-paystack-signature") signature: string,
	) {
		const raw = Buffer.isBuffer(req.body) ? req.body.toString("utf8") : "";
		const parsed = raw ? JSON.parse(raw) : {};
		return await this.webhookService.handleWebhook(parsed, signature, raw);
	}
}
