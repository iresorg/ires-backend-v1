import { Injectable } from "@nestjs/common";
import { EmailService } from "@/shared/email/service";
import { CreateContactInquiryDto } from "./dto/create-contact-inquiry.dto";

@Injectable()
export class ContactService {
	constructor(private readonly emailService: EmailService) {}

	async submitInquiry(dto: CreateContactInquiryDto) {
		await this.emailService.sendContactInquiryEmail({
			name: dto.name.trim(),
			email: dto.email.trim().toLowerCase(),
			phone: dto.phone.trim(),
			subject: dto.subject,
			message: dto.message.trim(),
		});

		return {
			message: "Your message has been sent. We will get back to you soon.",
		};
	}
}
