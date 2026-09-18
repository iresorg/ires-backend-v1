import { BadRequestException, ForbiddenException, Injectable } from "@nestjs/common";
import {
	ITicket,
	ITicketCreate,
	ITicketLifecycle,
	ITicketSummary,
	TicketSeverity,
	TicketStatus,
	TicketTiers,
} from "./interfaces/ticket.interface";
import { UsersService } from "@/modules/users/users.service";
import {
	TicketAccountNotEligibleError,
	TicketAccountNotFoundError,
	TicketNotFoundError,
} from "@/shared/errors/ticket.errors";
import { EmailService } from "@/shared/email/service";
import { Role } from "../users/enums/role.enum";
import { TicketsRepository } from "./repository";
import {
	TDatabaseService,
	TDatabaseTransaction,
} from "@/shared/database/datasource";
import { TicketLifecycleRepository } from "./ticket-lifecycle.repository";
import { AssignResponder, ReassignTicket } from "./types";
import { PaginatedResponse, PaginationQuery } from "@/shared/utils/pagination";
import { FileUploadService } from "../file-upload/service";
import { AccountsRepository } from "@/modules/accounts/repository/accounts.repository";
import { SubscriptionsRepository } from "@/modules/subscriptions/repository/subscriptions.repository";
import { IncidentCreditsRepository } from "@/modules/subscriptions/repository/incident-credits.repository";
import { TicketEntitlementSource } from "./entities/ticket.entity";
import { Account } from "@/modules/accounts/entities/account.entity";
import { IUser } from "@/modules/users/interfaces/user.interface";

export type TicketEligibility = {
	eligible: boolean;
	accountId: string;
	email: string;
	source: TicketEntitlementSource | null;
	subscription: {
		id: string;
		planName: string;
		maxIncidents: number | null;
		usedIncidents: number;
		remainingIncidents: number | null;
		currentPeriodStart: Date;
		currentPeriodEnd: Date;
	} | null;
	paygCreditsAvailable: number;
	reason?: string;
};

@Injectable()
export class TicketsService {
	constructor(
		private readonly ticketsRepository: TicketsRepository,
		private readonly ticketLifecyleRepo: TicketLifecycleRepository,
		private readonly usersService: UsersService,
		private readonly emailService: EmailService,
		private readonly databaseService: TDatabaseService,
		private readonly fileUploadService: FileUploadService,
		private readonly accountsRepo: AccountsRepository,
		private readonly subscriptionsRepo: SubscriptionsRepository,
		private readonly incidentCreditsRepo: IncidentCreditsRepository,
	) {}

	async getAccountEligibility(accountId: string): Promise<TicketEligibility> {
		const account = await this.accountsRepo.findById(accountId);
		if (!account) {
			throw new TicketAccountNotFoundError();
		}

		const paygCreditsAvailable =
			await this.incidentCreditsRepo.countAvailableByAccountId(accountId);

		const subscription =
			await this.subscriptionsRepo.findActiveSubscriptionByAccountId(
				accountId,
			);

		if (subscription) {
			const usedIncidents =
				await this.ticketsRepository.countTicketsForAccountInPeriod(
					accountId,
					subscription.currentPeriodStart,
					subscription.currentPeriodEnd,
				);
			const maxIncidents = subscription.plan.maxIncidents;
			const remainingIncidents =
				maxIncidents === null
					? null
					: Math.max(maxIncidents - usedIncidents, 0);
			const hasSubscriptionRoom =
				maxIncidents === null || usedIncidents < maxIncidents;

			if (hasSubscriptionRoom) {
				return {
					eligible: true,
					accountId: account.id,
					email: account.email,
					source: TicketEntitlementSource.SUBSCRIPTION,
					subscription: {
						id: subscription.id,
						planName: subscription.plan.name,
						maxIncidents,
						usedIncidents,
						remainingIncidents,
						currentPeriodStart: subscription.currentPeriodStart,
						currentPeriodEnd: subscription.currentPeriodEnd,
					},
					paygCreditsAvailable,
				};
			}

			if (paygCreditsAvailable > 0) {
				return {
					eligible: true,
					accountId: account.id,
					email: account.email,
					source: TicketEntitlementSource.PAYG,
					subscription: {
						id: subscription.id,
						planName: subscription.plan.name,
						maxIncidents,
						usedIncidents,
						remainingIncidents: 0,
						currentPeriodStart: subscription.currentPeriodStart,
						currentPeriodEnd: subscription.currentPeriodEnd,
					},
					paygCreditsAvailable,
				};
			}

			return {
				eligible: false,
				accountId: account.id,
				email: account.email,
				source: null,
				subscription: {
					id: subscription.id,
					planName: subscription.plan.name,
					maxIncidents,
					usedIncidents,
					remainingIncidents: 0,
					currentPeriodStart: subscription.currentPeriodStart,
					currentPeriodEnd: subscription.currentPeriodEnd,
				},
				paygCreditsAvailable: 0,
				reason: "Subscription incident limit reached and no PAYG credits available",
			};
		}

		if (paygCreditsAvailable > 0) {
			return {
				eligible: true,
				accountId: account.id,
				email: account.email,
				source: TicketEntitlementSource.PAYG,
				subscription: null,
				paygCreditsAvailable,
			};
		}

		return {
			eligible: false,
			accountId: account.id,
			email: account.email,
			source: null,
			subscription: null,
			paygCreditsAvailable: 0,
			reason:
				"No active subscription or unused pay-as-you-go credit",
		};
	}

	async createTicket(
		body: {
			accountId: string;
			createdById: string;
			title: string;
			description: string;
			location: string;
			reporterName: string;
			categoryId: string;
			subCategoryId?: string;
			internalNotes?: string;
			contactInformation?: ITicketCreate["contactInformation"];
			victimInformation?: ITicketCreate["victimInformation"];
			attachments?: string[];
			type?: string;
		},
		attachments?: Express.Multer.File[],
	): Promise<ITicket> {
		const eligibility = await this.getAccountEligibility(body.accountId);
		if (!eligibility.eligible || !eligibility.source) {
			throw new TicketAccountNotEligibleError(eligibility.reason);
		}

		const ticketId = this.generateTicketId();

		if (attachments?.length) {
			const result = await Promise.all(
				attachments.map((attachment) =>
					this.fileUploadService.uploadImage(attachment),
				),
			);
			body.attachments = result.map((res) => res.secure_url);
		}

		await this.databaseService.withTransaction(async (trx) => {
			let incidentCreditId: string | undefined;

			if (eligibility.source === TicketEntitlementSource.PAYG) {
				const credit =
					await this.incidentCreditsRepo.findAvailableByAccountId(
						body.accountId,
						trx,
					);
				if (!credit) {
					throw new TicketAccountNotEligibleError(
						"No unused pay-as-you-go credit available",
					);
				}
				incidentCreditId = credit.id;
				await this.incidentCreditsRepo.consumeCredit(
					credit.id,
					ticketId,
					trx,
				);
			} else if (
				eligibility.source === TicketEntitlementSource.SUBSCRIPTION &&
				eligibility.subscription
			) {
				// Re-check within the transaction window
				const used =
					await this.ticketsRepository.countTicketsForAccountInPeriod(
						body.accountId,
						eligibility.subscription.currentPeriodStart,
						eligibility.subscription.currentPeriodEnd,
						trx,
					);
				const max = eligibility.subscription.maxIncidents;
				if (max !== null && used >= max) {
					throw new TicketAccountNotEligibleError(
						"Subscription incident limit reached",
					);
				}
			}

			await this.ticketsRepository.createTicket(
				{
					...body,
					ticketId,
					createdForAccountId: body.accountId,
					entitlementSource: eligibility.source,
					incidentCreditId,
				},
				trx,
			);

			await this.ticketLifecyleRepo.create(
				{
					action: TicketStatus.CREATED,
					performedById: body.createdById,
					ticketId,
					notes: body.internalNotes,
				},
				trx,
			);
		});

		const [savedTicket, responderAdmins] = await Promise.all([
			this.ticketsRepository.getTicketById(ticketId),
			this.usersService.findAll({
				role: Role.RESPONDER_ADMIN,
			}),
		]);

		if (responderAdmins.length) {
			await this.emailService.sendNewTicketEmail(
				responderAdmins.map((admin) => admin.email),
				savedTicket.description,
				{
					id: savedTicket.createdBy.id,
					name: `${savedTicket.createdBy.firstName} ${savedTicket.createdBy.lastName}`,
					role: savedTicket.createdBy.role,
				},
				savedTicket.ticketId,
				savedTicket.title,
				savedTicket.createdAt.toUTCString(),
			);
		}

		const customer = await this.accountsRepo.findById(body.accountId);
		if (customer) {
			await this.notifyAccount(
				customer,
				savedTicket,
				TicketStatus.CREATED,
				"Your incident ticket has been created",
				"We have opened a ticket for your incident. Our team will review it shortly.",
			);
		}

		return savedTicket;
	}

	async getTicketById(ticketId: string): Promise<ITicket> {
		const ticket = await this.ticketsRepository.getTicketById(ticketId);
		if (!ticket) throw new TicketNotFoundError();

		return ticket;
	}

	async getAccountTickets(
		accountId: string,
		query: Partial<PaginationQuery & { status: TicketStatus }>,
	): Promise<PaginatedResponse<ITicketSummary>> {
		return this.ticketsRepository.getTickets(
			{ status: query.status, accountId },
			{ limit: query.limit, page: query.page },
		);
	}

	async getAccountTicketById(
		accountId: string,
		ticketId: string,
	): Promise<ITicket> {
		const ticket = await this.getTicketById(ticketId);
		if (ticket.createdFor?.id !== accountId) {
			throw new ForbiddenException(
				"You do not have access to this ticket",
			);
		}
		return this.toAccountTicketView(ticket);
	}

	async getAccountTicketLifecycle(
		accountId: string,
		ticketId: string,
		query: PaginationQuery,
	): Promise<PaginatedResponse<ITicketLifecycle>> {
		await this.getAccountTicketById(accountId, ticketId);
		return this.ticketLifecyleRepo.getByTicketId(ticketId, query);
	}

	async getTickets(
		query: Partial<PaginationQuery & { status: TicketStatus }>,
	): Promise<PaginatedResponse<ITicketSummary>> {
		return this.ticketsRepository.getTickets(
			{ status: query.status },
			{ limit: query.limit, page: query.page },
		);
	}

	async assignTicket(
		ticketId: string,
		performedById: string,
		body: AssignResponder,
	) {
		const [ticket, responder] = await Promise.all([
			this.getTicketById(ticketId),
			this.usersService.findOne({ id: body.assignedResponderId }),
		]);

		if (ticket.status !== TicketStatus.ANALYSING) {
			throw new BadRequestException(
				"Ticket should be analyzed before assignment",
			);
		}

		await this.databaseService.withTransaction(async (trx) => {
			const lifeCycleNotes =
				`Assigned responder: ${responder.firstName + " " + responder.lastName}` +
				(body.notes ? ` | ${body.notes}` : "");

			await this.updateStatusAndLifecycle(
				ticketId,
				TicketStatus.ASSIGNED,
				performedById,
				lifeCycleNotes,
				trx,
				body.assignedResponderId,
				body.severity,
				body.tier,
			);
		});

		const updated = await this.getTicketById(ticketId);
		await this.notifyResponderAssigned(responder, updated, false);
		await this.notifyCustomerStatus(
			updated,
			TicketStatus.ASSIGNED,
			"A responder has been assigned to your ticket",
			`Responder ${responder.firstName} ${responder.lastName} will handle your incident.`,
		);
	}

	async startAnalysingTicket(
		ticketId: string,
		performedById: string,
		notes?: string,
	) {
		await this.getTicketById(ticketId);

		await this.databaseService.withTransaction(async (trx) => {
			await this.updateStatusAndLifecycle(
				ticketId,
				TicketStatus.ANALYSING,
				performedById,
				notes,
				trx,
			);
		});

		const updated = await this.getTicketById(ticketId);
		await this.notifyCustomerStatus(
			updated,
			TicketStatus.ANALYSING,
			"Your ticket is being analysed",
			"Our team has started analysing your incident ticket.",
		);
	}

	async startRespondingToTicket(
		ticketId: string,
		performedById: string,
		notes?: string,
	) {
		await this.getTicketById(ticketId);
		await this.databaseService.withTransaction(async (trx) => {
			await this.updateStatusAndLifecycle(
				ticketId,
				TicketStatus.IN_PROGRESS,
				performedById,
				notes,
				trx,
			);
		});

		const updated = await this.getTicketById(ticketId);
		await this.notifyCustomerStatus(
			updated,
			TicketStatus.IN_PROGRESS,
			"Response is in progress on your ticket",
			"A responder is actively working on your incident.",
		);
		if (updated.assignedResponder) {
			await this.notifyResponderStatus(
				updated.assignedResponder.id,
				updated,
				TicketStatus.IN_PROGRESS,
				"Ticket response started",
				"You have started responding to this ticket.",
			);
		}
	}

	async escalateTicket(
		ticketId: string,
		performedById: string,
		escalationReason: string,
	) {
		const [ticket, performer, responderAdmins] = await Promise.all([
			this.getTicketById(ticketId),
			this.usersService.findOne({ id: performedById }),
			this.usersService.findAll({ role: Role.RESPONDER_ADMIN }),
		]);

		if (ticket.status !== TicketStatus.IN_PROGRESS) {
			throw new BadRequestException(
				"Ticket has to be in progress before it can be escalated.",
			);
		}

		await this.databaseService.withTransaction(async (trx) => {
			await this.updateStatusAndLifecycle(
				ticketId,
				TicketStatus.ESCALATED,
				performedById,
				escalationReason,
				trx,
			);
		});

		if (responderAdmins.length) {
			await this.emailService.sendTicketEscalatedEmail(
				responderAdmins.map((admin) => admin.email),
				{
					escalatedBy: `${performer.lastName} ${performer.firstName}`,
					escalationReason,
					subject: ticket.title,
					ticketId,
					timestamp: new Date().toLocaleString(),
				},
			);
		}

		const updated = await this.getTicketById(ticketId);
		await this.notifyCustomerStatus(
			updated,
			TicketStatus.ESCALATED,
			"Your ticket has been escalated",
			"Your incident has been escalated for higher-level review. We will keep you updated.",
		);
	}

	async reassignTicket(
		ticketId: string,
		performerById: string,
		body: ReassignTicket,
	) {
		const [ticket, responder] = await Promise.all([
			this.getTicketById(ticketId),
			this.usersService.findOne({ id: body.assignedResponderId }),
		]);

		await this.databaseService.withTransaction(async (trx) => {
			const lifeCycleNotes =
				`Reassigned responder: ${responder.firstName + " " + responder.lastName}` +
				(body.notes ? ` | ${body.notes}` : "");

			await this.updateStatusAndLifecycle(
				ticketId,
				TicketStatus.REASSIGNED,
				performerById,
				lifeCycleNotes,
				trx,
				body.assignedResponderId,
				body.severity,
				body.tier,
			);
		});

		const updated = await this.getTicketById(ticketId);
		await this.notifyResponderAssigned(responder, updated, true);
		await this.notifyCustomerStatus(
			updated,
			TicketStatus.REASSIGNED,
			"Your ticket has been reassigned",
			`Responder ${responder.firstName} ${responder.lastName} is now handling your incident.`,
		);

		if (
			ticket.assignedResponder &&
			ticket.assignedResponder.id !== responder.id
		) {
			await this.notifyResponderStatus(
				ticket.assignedResponder.id,
				updated,
				TicketStatus.REASSIGNED,
				"Ticket reassigned away from you",
				"This ticket has been reassigned to another responder.",
			);
		}
	}

	async resolveTicket(
		ticketId: string,
		performerById: string,
		notes?: string,
	) {
		await this.getTicketById(ticketId);
		await this.databaseService.withTransaction(async (trx) => {
			await this.updateStatusAndLifecycle(
				ticketId,
				TicketStatus.RESOLVED,
				performerById,
				notes,
				trx,
			);
		});

		const updated = await this.getTicketById(ticketId);
		await this.notifyCustomerStatus(
			updated,
			TicketStatus.RESOLVED,
			"Your ticket has been resolved",
			"Our team has marked your incident as resolved. You can review the update in your dashboard.",
		);
		if (updated.assignedResponder) {
			await this.notifyResponderStatus(
				updated.assignedResponder.id,
				updated,
				TicketStatus.RESOLVED,
				"Ticket resolved",
				"This ticket has been marked as resolved.",
			);
		}
	}

	async closeTicket(ticketId: string, performerById: string, notes?: string) {
		await this.getTicketById(ticketId);
		await this.databaseService.withTransaction(async (trx) => {
			await this.updateStatusAndLifecycle(
				ticketId,
				TicketStatus.CLOSED,
				performerById,
				notes,
				trx,
			);
		});

		const updated = await this.getTicketById(ticketId);
		await this.notifyCustomerStatus(
			updated,
			TicketStatus.CLOSED,
			"Your ticket has been closed",
			"Your incident ticket is now closed. Contact support if you need further help.",
		);
		if (updated.assignedResponder) {
			await this.notifyResponderStatus(
				updated.assignedResponder.id,
				updated,
				TicketStatus.CLOSED,
				"Ticket closed",
				"This ticket has been closed.",
			);
		}
	}

	private async updateStatusAndLifecycle(
		ticketId: string,
		status: TicketStatus,
		performedById: string,
		notes?: string,
		trx?: TDatabaseTransaction,
		assignedResponderId?: string,
		severity?: TicketSeverity,
		tier?: TicketTiers,
	) {
		await Promise.all([
			this.ticketsRepository.updateTicket(
				ticketId,
				{ status, assignedResponderId, severity, tier },
				trx,
			),
			this.ticketLifecyleRepo.create(
				{ ticketId, action: status, performedById, notes },
				trx,
			),
		]);
	}

	async getTicketLifecycle(
		ticketId: string,
		query: PaginationQuery,
	): Promise<PaginatedResponse<ITicketLifecycle>> {
		return this.ticketLifecyleRepo.getByTicketId(ticketId, query);
	}

	generateTicketId(): string {
		return `iRS-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 15).toUpperCase()}`;
	}

	async escalationHistory(
		query: PaginationQuery,
	): Promise<PaginatedResponse<ITicketLifecycle>> {
		return this.ticketLifecyleRepo.getAll(
			{ action: TicketStatus.ESCALATED },
			query,
		);
	}

	private toAccountTicketView(ticket: ITicket): ITicket {
		const { internalNotes: _internalNotes, ...safe } = ticket;
		return safe;
	}

	private accountGreetingName(account: Account): string {
		if (account.individualProfile?.firstName) {
			return account.individualProfile.firstName;
		}
		if (account.organizationProfile?.organizationName) {
			return account.organizationProfile.organizationName;
		}
		return account.email;
	}

	private async notifyAccount(
		account: Account,
		ticket: ITicket,
		status: TicketStatus,
		subject: string,
		intro: string,
		details?: string,
	) {
		await this.emailService.sendTicketStatusUpdateEmail(account.email, {
			greetingName: this.accountGreetingName(account),
			intro,
			ticketId: ticket.ticketId,
			title: ticket.title,
			status,
			subject,
			headerText: "Ticket Update",
			details,
		});
	}

	private async notifyCustomerStatus(
		ticket: ITicket,
		status: TicketStatus,
		subject: string,
		intro: string,
		details?: string,
	) {
		if (!ticket.createdFor?.id) return;
		const account = await this.accountsRepo.findById(ticket.createdFor.id);
		if (!account) return;
		await this.notifyAccount(
			account,
			ticket,
			status,
			subject,
			intro,
			details,
		);
	}

	private async notifyResponderAssigned(
		responder: Pick<IUser, "email" | "firstName">,
		ticket: ITicket,
		isReassign: boolean,
	) {
		const subject = isReassign
			? "Ticket reassigned to you"
			: "New ticket assigned to you";
		const intro = isReassign
			? "A ticket has been reassigned to you. Please review and continue response."
			: "A ticket has been assigned to you. Please review and begin response.";

		await this.emailService.sendTicketStatusUpdateEmail(responder.email, {
			greetingName: responder.firstName || responder.email,
			intro,
			ticketId: ticket.ticketId,
			title: ticket.title,
			status: ticket.status,
			subject,
			headerText: isReassign ? "Ticket Reassigned" : "Ticket Assigned",
			details: ticket.severity
				? `Severity: ${ticket.severity}${ticket.tier ? ` | Tier: ${ticket.tier}` : ""}`
				: undefined,
		});
	}

	private async notifyResponderStatus(
		responderId: string,
		ticket: ITicket,
		status: TicketStatus,
		subject: string,
		intro: string,
	) {
		const responder = await this.usersService.findOne({ id: responderId });
		if (!responder?.email) return;

		await this.emailService.sendTicketStatusUpdateEmail(responder.email, {
			greetingName: responder.firstName || responder.email,
			intro,
			ticketId: ticket.ticketId,
			title: ticket.title,
			status,
			subject,
			headerText: "Ticket Update",
		});
	}
}
