import { Injectable } from "@nestjs/common";
import { EmailConsumer } from "../queue/consumers/email.consumer";
import { EmailPayload } from "./types";
import { Role } from "@/modules/users/enums/role.enum";
import { TicketEscalateParams } from "./templates/TicketEscalated";

@Injectable()
export class EmailService {
	constructor(private readonly emailConsumer: EmailConsumer) {}

	async sendWelcomeEmail(
		email: string,
		password: string,
		name: string,
	): Promise<void> {
		const payload: EmailPayload<"NewUser"> = {
			to: [email],
			from: "techsupport@iresorg.com",
			subject: "Welcome to iRes - Your Account Details",
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
			from: "techsupport@iresorg.com",
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
			from: "techsupport@iresorg.com",
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

	async sendAccountVerificationEmail(email: string, otp: string) {
		const payload: EmailPayload<"VerifyEmail"> = {
			to: [email],
			from: "techsupport@iresorg.com",
			subject: "Verify your email",
			template: "VerifyEmail",
			options: { headerText: "Verify your email", otp },
		};
		await this.emailConsumer.publishEmailToQueue(payload);
	}

	async sendPasswordResetEmail(email: string, resetToken: string) {
		const payload: EmailPayload<"PasswordReset"> = {
			to: [email],
			from: "techsupport@iresorg.com",
			subject: "Reset your password",
			template: "PasswordReset",
			options: {
				headerText: "Reset your password",
				resetToken,
				email,
			},
		};
		await this.emailConsumer.publishEmailToQueue(payload);
	}

	async sendAccountWelcomeEmail(
		email: string,
		userName: string,
		accountType: "individual" | "organization",
	): Promise<void> {
		const payload: EmailPayload<"AccountWelcome"> = {
			to: [email],
			from: "techsupport@iresorg.com",
			subject: "Welcome to iRes - Your Account is Ready!",
			template: "AccountWelcome",
			options: {
				headerText: "Welcome to iRes",
				userName,
				accountType,
			},
		};

		await this.emailConsumer.publishEmailToQueue(payload);
	}

	async sendSubscriptionActivatedEmail(
		email: string,
		userName: string,
		planName: string,
		billingDate: string,
	): Promise<void> {
		const payload: EmailPayload<"SubscriptionActivated"> = {
			to: [email],
			from: "techsupport@iresorg.com",
			subject: "Subscription Activated - Welcome!",
			template: "SubscriptionActivated",
			options: {
				userName,
				planName,
				billingDate,
			},
		};

		await this.emailConsumer.publishEmailToQueue(payload);
	}

	async sendSubscriptionCancelledEmail(
		email: string,
		userName: string,
		planName: string,
		endDate: string,
	): Promise<void> {
		const payload: EmailPayload<"SubscriptionCancelled"> = {
			to: [email],
			from: "techsupport@iresorg.com",
			subject: "Subscription Cancelled",
			template: "SubscriptionCancelled",
			options: {
				userName,
				planName,
				endDate,
			},
		};

		await this.emailConsumer.publishEmailToQueue(payload);
	}

	async sendPaymentFailedEmail(
		email: string,
		userName: string,
		planName: string,
	): Promise<void> {
		const payload: EmailPayload<"PaymentFailed"> = {
			to: [email],
			from: "techsupport@iresorg.com",
			subject: "Payment Failed - Action Required",
			template: "PaymentFailed",
			options: {
				userName,
				planName,
			},
		};

		await this.emailConsumer.publishEmailToQueue(payload);
	}

	async sendSubscriptionEndedEmail(
		email: string,
		userName: string,
		planName: string,
	): Promise<void> {
		const payload: EmailPayload<"SubscriptionEnded"> = {
			to: [email],
			from: "techsupport@iresorg.com",
			subject: "Subscription Expired",
			template: "SubscriptionEnded",
			options: {
				userName,
				planName,
			},
		};

		await this.emailConsumer.publishEmailToQueue(payload);
	}
}
