import { Body, Controller, Post } from "@nestjs/common";
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Public } from "@/shared/decorators/public.decorator";
import { ContactService } from "./contact.service";
import { CreateContactInquiryDto } from "./dto/create-contact-inquiry.dto";

@ApiTags("Contact")
@Controller("contact")
export class ContactController {
	constructor(private readonly contactService: ContactService) {}

	@Public()
	@Post()
	@ApiOperation({
		summary: "Submit contact inquiry",
		description:
			"Public encrypted-inquiry form. Sends the message to the platform EMAIL_FROM inbox.",
	})
	@ApiBody({ type: CreateContactInquiryDto })
	@ApiResponse({
		status: 201,
		description: "Inquiry accepted and queued for delivery",
		schema: {
			type: "object",
			properties: {
				message: {
					type: "string",
					example:
						"Your message has been sent. We will get back to you soon.",
				},
			},
		},
	})
	async submit(@Body() body: CreateContactInquiryDto) {
		return await this.contactService.submitInquiry(body);
	}
}
