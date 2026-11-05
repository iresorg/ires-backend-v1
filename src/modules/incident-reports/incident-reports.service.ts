import { randomBytes } from "crypto";
import {
	BadRequestException,
	ConflictException,
	ForbiddenException,
	HttpException,
	HttpStatus,
	Injectable,
	InternalServerErrorException,
	Logger,
	NotFoundException,
	UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { render } from "@react-email/render";
import { EmailService } from "@/shared/email/service";
import { EnvVariables } from "@/utils/env.validate";
import { AccountsService } from "@/modules/accounts/services/accounts.service";
import { AccountsRepository } from "@/modules/accounts/repository/accounts.repository";
import { UsersService } from "@/modules/users/users.service";
import { Role } from "@/modules/users/enums/role.enum";
import { User } from "@/modules/users/entities/user.entity";
import { Account } from "@/modules/accounts/entities/account.entity";
import { TicketStatus } from "@/modules/tickets/interfaces/ticket.interface";
import { buildPaginationResult } from "@/shared/utils/pagination.util";
import IncidentCreated from "@/shared/email/templates/IncidentCreated";
import IncidentReportConfirmation from "@/shared/email/templates/IncidentReportConfirmation";
import IncidentReportToSupport from "@/shared/email/templates/IncidentReportToSupport";
import { CreateIncidentReportDto } from "./dto/create-incident-report.dto";
import { CreateAccountIncidentDto } from "./dto/create-account-incident.dto";
import { UpdateCustomerIncidentDto } from "./dto/update-incident-report.dto";
import { IncidentReportsRepository } from "./incident-reports.repository";
import { IncidentReport } from "./entities/incident-report.entity";
import { toIncidentView } from "./incident-report.view";

const WINDOW_MS = 60 * 60 * 1000;
const MAX_REPORTS_PER_WINDOW = 5;

@Injectable()
export class IncidentReportsService {
	private readonly hits = new Map<string, number[]>();
	private readonly logger = new Logger(IncidentReportsService.name);

	constructor(
		private readonly emailService: EmailService,
		private readonly config: ConfigService<EnvVariables>,
		private readonly accountsService: AccountsService,
		private readonly accountsRepo: AccountsRepository,
		private readonly usersService: UsersService,
		private readonly repo: IncidentReportsRepository,
	) {}

	async submit(dto: CreateIncidentReportDto, ip: string) {
		this.assertWithinLimit(ip);
		const { incident, created } = await this.createIncident(dto, null);
		return {
			message: "Incident report received",
			incidentReference: incident.reference,
			accountCreated: created,
		};
	}

	async submitForStaff(dto: CreateIncidentReportDto, staffId: string) {
		const { incident, created } = await this.createIncident(dto, staffId);
		return {
			message: "Incident report received",
			incidentReference: incident.reference,
			accountCreated: created,
		};
	}

	async submitForAccount(accountId: string, dto: CreateAccountIncidentDto) {
		const account = await this.accountsRepo.findById(accountId);
		if (!account) throw new UnauthorizedException("Account not found");
		const { incident } = await this.createIncident(
			{
				...dto,
				email: account.email,
				confirmed: true,
			},
			null,
			account,
		);
		return {
			message: "Incident report received",
			incidentReference: incident.reference,
			accountCreated: false,
			incident: await this.oneView(incident, false),
		};
	}

	async countsForAccount(accountId: string) {
		const rows = await this.repo.countByStatusForAccount(accountId);
		const open = rows.find((row) => row.status === "OPEN")?.count ?? 0;
		const closed = rows.find((row) => row.status === "CLOSED")?.count ?? 0;
		return { total: open + closed, open, closed };
	}

	async listForAccount(accountId: string, page = 1, limit = 10, status?: "OPEN" | "CLOSED") {
		const { rows, total } = await this.repo.search({
			accountId,
			status,
			page,
			limit,
		});
		const views = await this.views(rows, false);
		return buildPaginationResult(views, total, { page, limit });
	}

	async getForAccount(accountId: string, id: string) {
		const incident = await this.requireIncident(id);
		if (incident.account?.id !== accountId) {
			throw new ForbiddenException("You do not have access to this incident");
		}
		return { incident: await this.oneView(incident, false) };
	}

	async updateForAccount(
		accountId: string,
		id: string,
		patch: UpdateCustomerIncidentDto,
	) {
		const incident = await this.requireIncident(id);
		if (incident.account?.id !== accountId) {
			throw new ForbiddenException("You do not have access to this incident");
		}
		await this.assertOpen(incident);
		this.applyPatch(incident, patch);
		await this.repo.save(incident);
		return { incident: await this.oneView(await this.requireIncident(id), false) };
	}

	async listAssignees(search?: string) {
		const users = await this.usersService.findByRoles([
			Role.AGENT,
			Role.AGENT_ADMIN,
		]);
		const needle = search?.trim().toLowerCase();
		const active = users.filter((user) => {
			if (user.status !== "active") return false;
			if (!needle) return true;
			const name = `${user.firstName} ${user.lastName}`.toLowerCase();
			return (
				name.includes(needle) || user.email.toLowerCase().includes(needle)
			);
		});
		return active;
	}

	async queue(
		caller: { id: string; role: Role },
		query: {
			page?: number;
			limit?: number;
			status?: "OPEN" | "CLOSED";
			assigned?: boolean;
		},
	) {
		const page = query.page ?? 1;
		const limit = query.limit ?? 10;
		const agentOnly = caller.role === Role.AGENT;
		const { rows, total } = await this.repo.search({
			page,
			limit,
			status: query.status,
			assignedAgentId: agentOnly ? caller.id : undefined,
			assigned: agentOnly ? undefined : query.assigned,
		});
		return buildPaginationResult(await this.views(rows, true), total, {
			page,
			limit,
		});
	}

	async getForStaff(caller: { id: string; role: Role }, id: string) {
		const incident = await this.requireIncident(id);
		this.assertStaffCanSee(caller, incident);
		return { incident: await this.oneView(incident, true) };
	}

	async updateForStaff(
		caller: { id: string; role: Role },
		id: string,
		patch: UpdateCustomerIncidentDto & {
			severity?: string;
			incidentType?: string;
		},
	) {
		const incident = await this.requireIncident(id);
		this.assertStaffCanSee(caller, incident);
		await this.assertOpen(incident);
		this.applyPatch(incident, patch);
		await this.repo.save(incident);
		return { incident: await this.oneView(await this.requireIncident(id), true) };
	}

	async assignAgent(id: string, agentId: string) {
		const incident = await this.requireIncident(id);
		await this.assertOpen(incident);
		const agent = await this.usersService.findOne({ id: agentId });
		const canMonitor =
			agent?.role === Role.AGENT || agent?.role === Role.AGENT_ADMIN;
		if (!agent || !canMonitor || agent.status !== "active") {
			throw new BadRequestException(
				"agentId must be an active agent or agent admin",
			);
		}
		incident.assignedAgent = { id: agent.id } as User;
		await this.repo.save(incident);
		try {
			await this.emailService.sendIncidentAssignedEmail({
				email: agent.email,
				agentName: agent.firstName || agent.email,
				reference: incident.reference,
				severity: incident.severity,
				incidentType: incident.incidentType,
				organization: incident.organization ?? undefined,
				customerEmail: incident.email,
			});
		} catch {
			throw new InternalServerErrorException(
				"Could not send the assignment email.",
			);
		}
		return { incident: await this.oneView(await this.requireIncident(id), true) };
	}

	async linkTicket(incidentId: string, ticketId: string, accountId?: string) {
		const incident = await this.requireIncident(incidentId);
		await this.assertCanLink(incident, ticketId, accountId);
		incident.ticketId = ticketId;
		await this.repo.save(incident);
		return { incident: await this.oneView(await this.requireIncident(incidentId), true) };
	}

	async closeByTicketId(ticketId: string): Promise<void> {
		await this.repo.closeByTicketId(ticketId);
	}

	async referencesForTickets(ticketIds: string[]) {
		const rows = await this.repo.findByTicketIds(ticketIds);
		const map = new Map<string, { id: string; reference: string }>();
		for (const row of rows) {
			if (row.ticketId) {
				map.set(row.ticketId, { id: row.id, reference: row.reference });
			}
		}
		return map;
	}

	private async createIncident(
		dto: CreateIncidentReportDto,
		staffId: string | null,
		knownAccount?: Account,
	) {
		const to = this.config.get("SUPPORT_EMAIL");
		if (!to) {
			throw new InternalServerErrorException("Could not send the report.");
		}

		const { account, created } = knownAccount
			? { account: knownAccount, created: false }
			: await this.accountsService.provisionIndividualForIncident({
					email: dto.email,
					name: dto.name,
					phone: dto.phone,
				});

		const reportedAt = new Date();
		const reference = createIncidentReference(reportedAt);
		const incident = this.repo.create({
			reference,
			account: { id: account.id } as Account,
			status: "OPEN",
			severity: dto.severity,
			incidentType: dto.incidentType,
			ongoing: dto.ongoing,
			name: dto.name,
			organization: dto.organization ?? null,
			phone: dto.phone,
			email: dto.email.trim(),
			detectedAt: dto.detectedAt ?? null,
			affectedSystems: dto.affectedSystems ?? null,
			description: dto.description,
			createdByStaffId: staffId,
		});
		await this.repo.save(incident);

		const subject = `Incident report — ${reference} — ${dto.severity} — ${dto.incidentType.replace(/[\r\n]+/g, " ")}`;
		try {
			const html = await render(
				IncidentReportToSupport({
					headerText: "New incident report",
					reference,
					severity: dto.severity,
					incidentType: dto.incidentType,
					ongoing: dto.ongoing,
					name: dto.name,
					organization: dto.organization,
					phone: dto.phone,
					email: dto.email,
					detectedAt: dto.detectedAt,
					affectedSystems: dto.affectedSystems,
					description: dto.description,
				}),
			);
			await this.emailService.sendHtmlEmail({
				to,
				replyTo: dto.email,
				subject,
				html,
			});
		} catch {
			throw new InternalServerErrorException("Could not send the report.");
		}

		try {
			const html = knownAccount
				? await render(
						IncidentCreated({
							firstName: firstNameFrom(dto.name),
							reference,
							incidentType: dto.incidentType,
							severity: dto.severity,
							organization: dto.organization,
						}),
					)
				: await render(
						IncidentReportConfirmation({
							firstName: firstNameFrom(dto.name),
							reference,
							organization: dto.organization,
							incidentType: dto.incidentType,
							severity: dto.severity,
							ongoing: dto.ongoing,
							reportedAt: formatReportedAt(reportedAt),
							website: "https://iresorg.com",
						}),
					);
			await this.emailService.sendHtmlEmail({
				to: dto.email,
				subject: knownAccount
					? `Incident created — ${reference}`
					: `We received your incident report — ${reference}`,
				html,
			});
		} catch (error) {
			this.logger.error(
				"Incident report was delivered to support, but the confirmation email failed",
				error instanceof Error ? error.stack : undefined,
			);
		}

		return { incident, created };
	}

	private async requireIncident(id: string): Promise<IncidentReport> {
		const incident = await this.repo.findByIdOrReference(id);
		if (!incident) throw new NotFoundException("Incident not found");
		return incident;
	}

	private assertStaffCanSee(
		caller: { id: string; role: Role },
		incident: IncidentReport,
	) {
		if (caller.role === Role.AGENT && incident.assignedAgent?.id !== caller.id) {
			throw new ForbiddenException("You do not have access to this incident");
		}
	}

	private async assertOpen(incident: IncidentReport) {
		if (incident.status === "CLOSED") {
			throw new ConflictException("Incident is closed");
		}
		if (!incident.ticketId) return;
		const ticket = await this.repo.findTicket(incident.ticketId);
		if (ticket?.status === TicketStatus.CLOSED) {
			throw new ConflictException("Incident is closed");
		}
	}

	private async assertCanLink(
		incident: IncidentReport,
		ticketId: string,
		accountId?: string,
	) {
		await this.assertOpen(incident);
		const ticket = await this.repo.findTicket(ticketId);
		if (!ticket) throw new NotFoundException("Ticket not found");
		if (ticket.status === TicketStatus.CLOSED) {
			throw new ConflictException("Incident is closed");
		}
		const ticketAccountId = ticket.createdFor?.id;
		const ownerId = accountId ?? incident.account?.id;
		if (!ticketAccountId || ticketAccountId !== ownerId) {
			throw new BadRequestException(
				"Ticket customer does not match the incident",
			);
		}
		if (
			incident.ticketId &&
			incident.ticketId !== ticketId
		) {
			const previous = await this.repo.findTicket(incident.ticketId);
			if (previous?.status === TicketStatus.CLOSED) {
				throw new ConflictException("Incident is closed");
			}
		}
	}

	private applyPatch(
		incident: IncidentReport,
		patch: UpdateCustomerIncidentDto & {
			severity?: string;
			incidentType?: string;
		},
	) {
		if (patch.ongoing !== undefined) incident.ongoing = patch.ongoing;
		if (patch.phone !== undefined) incident.phone = patch.phone;
		if (patch.detectedAt !== undefined) incident.detectedAt = patch.detectedAt;
		if (patch.affectedSystems !== undefined) {
			incident.affectedSystems = patch.affectedSystems;
		}
		if (patch.description !== undefined) incident.description = patch.description;
		if (patch.severity !== undefined) incident.severity = patch.severity;
		if (patch.incidentType !== undefined) {
			incident.incidentType = patch.incidentType;
		}
	}

	private async views(rows: IncidentReport[], includeStaff: boolean) {
		const statuses = await this.repo.ticketStatuses(
			rows.map((row) => row.ticketId || ""),
		);
		return rows.map((row) =>
			toIncidentView(
				row,
				row.ticketId ? statuses.get(row.ticketId) ?? null : null,
				includeStaff,
			),
		);
	}

	private async oneView(incident: IncidentReport, includeStaff: boolean) {
		const [view] = await this.views([incident], includeStaff);
		return view;
	}

	private assertWithinLimit(ip: string) {
		const now = Date.now();
		const recent = (this.hits.get(ip) ?? []).filter(
			(at) => now - at < WINDOW_MS,
		);
		if (recent.length >= MAX_REPORTS_PER_WINDOW) {
			throw new HttpException(
				"Too many incident reports. Try again later.",
				HttpStatus.TOO_MANY_REQUESTS,
			);
		}
		recent.push(now);
		this.hits.set(ip, recent);
	}
}

function firstNameFrom(name: string): string {
	const first = name.trim().split(/\s+/)[0];
	return first || name.trim();
}

function createIncidentReference(when: Date): string {
	const date = new Intl.DateTimeFormat("en-CA", {
		timeZone: "Africa/Lagos",
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	})
		.format(when)
		.replaceAll("-", "");
	const suffix = randomBytes(3).toString("hex").toUpperCase();
	return `IR-${date}-${suffix}`;
}

function formatReportedAt(when: Date): string {
	return new Intl.DateTimeFormat("en-GB", {
		timeZone: "Africa/Lagos",
		dateStyle: "long",
		timeStyle: "short",
	}).format(when);
}
