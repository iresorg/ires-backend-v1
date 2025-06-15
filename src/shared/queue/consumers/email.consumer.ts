import { Injectable, OnModuleInit } from "@nestjs/common";
import { QueueService } from "../service";
import { ConfigService } from "@nestjs/config";
import { EnvVariables } from "@/utils/env.validate";
import * as nodemailer from "nodemailer";
import SMTPTransport from "nodemailer/lib/smtp-transport";
import { ConsumeMessage } from "amqplib";
import { render } from "@react-email/render";
import NewUser from "@/shared/email/templates/NewUser";
import { EmailComponent, EmailPayload } from "@/shared/email/types";
import { Logger } from "@/shared/logger/service";

export const templates = {
	NewUser,
};

@Injectable()
export class EmailConsumer implements OnModuleInit {
	private readonly queueName = "enail_queue";
	private mailer: nodemailer.Transporter<
		SMTPTransport.SentMessageInfo,
		SMTPTransport.Options
	>;

	constructor(
		private readonly queueService: QueueService,
		private readonly configService: ConfigService<EnvVariables>,
		private readonly logger: Logger,
	) {}

	setupMailClient() {
		this.mailer = nodemailer.createTransport({
			host: this.configService.get("EMAIL_HOST"),
			port: this.configService.get("EMAIL_PORT"),
			auth: {
				user: this.configService.get("EMAIL_USER"),
				pass: this.configService.get("EMAIL_PASSWORD"),
			},
		});
	}

	async onModuleInit() {
		this.setupMailClient();
		await this.register();
		this.logger.log("Email queue consumer registered successfully");
	}

	async register() {
		await this.queueService.registerConsumer(
			this.queueName,
			this.consumeMail,
		);
	}

	private consumeMail = async (
		message: ConsumeMessage | null,
	): Promise<void> => {
		try {
			if (!message) return;

			const { content } = message;
			const { from, to, subject, template, options } = JSON.parse(
				content.toString(),
			) as EmailPayload;

			const component = templates[template] as EmailComponent;
			if (!component) {
				throw new Error(`Template ${template} not found`);
			}
			const emailBody = await render(component(options));

			await this.sendMail({ from, to, subject, html: emailBody });

			this.queueService.acknowledgeMessage(message);
		} catch (error) {
			this.logger.error("Failed to process email message", {
				error: error as Error,
				content: JSON.parse(
					message?.content.toString() ?? "{}",
				) as object,
			});

			throw error;
		}
	};

	async sendMail({
		from,
		to,
		subject,
		html,
	}: {
		from: string;
		to: string;
		subject: string;
		html: string;
	}) {
		await this.mailer.sendMail({ from, to, subject, html });
	}

	async publishEmailToQueue<T>(payload: EmailPayload<T>) {
		await this.queueService.sendToQueue(this.queueName, payload);
	}
}
