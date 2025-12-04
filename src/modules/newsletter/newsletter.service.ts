import { Injectable, InternalServerErrorException } from "@nestjs/common";
import axios from "axios";
import { ConfigService } from "@nestjs/config";
import { NewsletterSubscribeDto } from "./dto/newsletter-subscribe.dto";

@Injectable()
export class NewsletterService {
	private readonly mailchimpApiKey: string;
	private readonly mailchimpAudienceId: string;
	private readonly mailchimpServerPrefix: string;

	constructor(private readonly configService: ConfigService) {
		this.mailchimpApiKey =
			this.configService.get<string>("MAILCHIMP_API_KEY");
		this.mailchimpAudienceId = this.configService.get<string>(
			"MAILCHIMP_AUDIENCE_ID",
		);
		this.mailchimpServerPrefix = this.configService.get<string>(
			"MAILCHIMP_SERVER_PREFIX",
		);
	}

	async subscribe(dto: NewsletterSubscribeDto) {
		try {
			const dataCenter = this.mailchimpServerPrefix;

			const url = `https://${dataCenter}.api.mailchimp.com/3.0/lists/${this.mailchimpAudienceId}/members`;

			const payload: Record<string, unknown> = {
				email_address: dto.email,
				status: "subscribed",
				merge_fields: {},
			};

			if (dto.firstName) {
				(payload.merge_fields as Record<string, unknown>).FNAME =
					dto.firstName;
			}

			if (dto.lastName) {
				(payload.merge_fields as Record<string, unknown>).LNAME =
					dto.lastName;
			}

			await axios.post(url, payload, {
				auth: {
					username: "anystring",
					password: this.mailchimpApiKey,
				},
			});

			return {
				message: "You have been subscribed to the newsletter",
			};
		} catch (error) {
			throw new InternalServerErrorException(
				"Failed to subscribe to newsletter",
			);
		}
	}
}
