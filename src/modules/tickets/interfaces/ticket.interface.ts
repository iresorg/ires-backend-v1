import { Role } from "@/modules/users/enums/role.enum";
import { TicketEntitlementSource } from "../entities/ticket.entity";

export interface VictimInformation {
	name: string;
	age: number;
	gender: string;
	phone: string;
	address: string;
	email: string;
}

export enum TicketStatus {
	CREATED = "CREATED",
	PENDING = "PENDING",
	ANALYSING = "ANALYSING",
	ASSIGNED = "ASSIGNED",
	REASSIGNED = "REASSIGNED",
	IN_PROGRESS = "IN_PROGRESS",
	RESOLVED = "RESOLVED",
	CLOSED = "CLOSED",
	ESCALATED = "ESCALATED",
}

export enum TicketTiers {
	TIER_1 = "TIER_1",
	TIER_2 = "TIER_2",
}

export interface ContactInformation {
	email: string;
	phone: string;
	address: string;
}

export type ITicketSummary = Pick<
	ITicket,
	| "ticketId"
	| "title"
	| "tier"
	| "status"
	| "severity"
	| "createdAt"
	| "updatedAt"
	| "category"
	| "subCategory"
	| "createdFor"
	| "entitlementSource"
>;

export interface ITicket {
	ticketId: string;
	title: string;
	tier: TicketTiers;
	description: string;
	status: TicketStatus;
	severity?: TicketSeverity;
	location: string;
	victimInformation?: Partial<VictimInformation>;
	attachments?: string[];
	reporterName: string;
	contactInformation?: Partial<ContactInformation>;
	internalNotes?: string;
	createdAt: Date;
	updatedAt: Date;
	createdBy: {
		id: string;
		firstName?: string;
		lastName?: string;
		role: Role;
	};
	createdFor?: {
		id: string;
		email: string;
		role: string;
		status: string;
	};
	entitlementSource?: TicketEntitlementSource | null;
	assignedResponder?: {
		id: string;
		firstName: string;
		lastName: string;
		role: Role;
	};
	category: {
		id: string;
		name: string;
		createdAt: Date;
	};
	subCategory?: {
		id: string;
		name: string;
		createdAt: Date;
	};
}

export type IUpdateTicket = Pick<
	ITicket,
	"status" | "severity" | "attachments" | "tier"
> & { assignedResponderId: string };

export interface ITicketLifecycle {
	id: string;
	ticketId: string;
	action: TicketStatus;
	performedBy: {
		id: string;
		firstName?: string;
		lastName?: string;
		role: Role;
	};
	notes: string;
	createdAt: Date;
}

export type ITicketLifecycleCreate = Omit<ITicketLifecycle, "performedBy"> & {
	performedById: string;
};

export enum TicketSeverity {
	LOW = "LOW",
	MEDIUM = "MEDIUM",
	HIGH = "HIGH",
}

export type ITicketCreate = Omit<
	ITicket,
	| "status"
	| "createdAt"
	| "updatedAt"
	| "severity"
	| "createdBy"
	| "createdFor"
	| "tier"
	| "category"
	| "entitlementSource"
> & {
	ticketId: string;
	createdById: string;
	createdForAccountId: string;
	categoryId: string;
	subCategoryId?: string;
	entitlementSource?: TicketEntitlementSource;
	incidentCreditId?: string;
};

export type ITicketUpdate = Partial<ITicket>;
