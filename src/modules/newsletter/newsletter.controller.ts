import { Body, Controller, Post } from "@nestjs/common";
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Public } from "@/shared/decorators/public.decorator";
import { NewsletterService } from "./newsletter.service";
import { NewsletterSubscribeDto } from "./dto/newsletter-subscribe.dto";

@ApiTags("Newsletter")
@Controller("newsletter")
export class NewsletterController {
	constructor(private readonly newsletterService: NewsletterService) {}

	@Public()
	@Post("subscribe")
	@ApiOperation({
		summary: "Subscribe to newsletter",
		description:
			"Public endpoint for users to subscribe to the newsletter without creating an account.",
	})
	@ApiBody({ type: NewsletterSubscribeDto })
	@ApiResponse({
		status: 200,
		description: "Successfully subscribed to newsletter",
		schema: {
			type: "object",
			properties: {
				message: {
					type: "string",
					example: "You have been subscribed to the newsletter",
				},
			},
		},
	})
	async subscribe(@Body() body: NewsletterSubscribeDto) {
		return await this.newsletterService.subscribe(body);
	}
}
