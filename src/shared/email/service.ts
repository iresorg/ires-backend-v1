import { Injectable } from "@nestjs/common";
import { EmailConsumer } from "../queue/consumers/email.consumer";
import { EmailPayload } from "./types";
import { Role } from "@/modules/users/enums/role.enum";
import { TicketEscalateParams } from "./templates/TicketEscalated";

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

	async sendNewTicketEmail(
		email: string[],
		descriptionn: string,
		submittedBy: {
			id: string;
			name?: string;
			role: Role;
		},
		ticketId: string,
		title: string,
		createdAt: string,
	) {
		const payload: EmailPayload<"NewTicket"> = {
			to: email,
			from: "support@ires.co",
			subject: "Action Required - New Ticket Submitted",
			template: "NewTicket",
			options: {
				createdAt,
				descriptionn,
				headerText: "New Ticket Submitted",
				link: "#",
				submittedBy,
				ticketId,
				title,
			},
		};

		await this.emailConsumer.publishEmailToQueue(payload);
	}

	async sendTicketEscalatedEmail(
		email: string[],
		escalationDetails: Omit<TicketEscalateParams, "headerText">,
	) {
		const { escalatedBy, escalationReason, subject, ticketId, timestamp } =
			escalationDetails;

		const payload: EmailPayload<"TicketEscalated"> = {
			to: email,
			from: "support@ires.co",
			subject: "Ticket Escalated: Action Required",
			template: "TicketEscalated",
			options: {
				timestamp,
				escalatedBy,
				headerText: "Action Required",
				ticketId,
				subject,
				escalationReason,
			},
		};

		await this.emailConsumer.publishEmailToQueue(payload);
	}
}
