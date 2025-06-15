import { Injectable } from "@nestjs/common";
import { EmailConsumer } from "../queue/consumers/email.consumer";
import { EmailPayload } from "./types";

@Injectable()
export class EmailService {
	constructor(private readonly emailConsumer: EmailConsumer) {}

	async sendWelcomeEmail(email: string, password: string, name: string) {
		const payload: EmailPayload<"NewUser"> = {
			to: email,
			from: "support@ires.co",
			subject: "Welcome to iRes",
			template: "NewUser",
			options: {
				userName: name,
				headerText: "Welcome to iRes",
				password,
			},
		};

		await this.emailConsumer.publishEmailToQueue(payload);
	}
}
