import { IUser } from "@/modules/users/interfaces/user.interface";
import { IAgent } from "@/modules/agents/interfaces/agent.interface";
import { IResponder } from "@/modules/responders/interfaces/responder.interface";
import { Role } from "@/modules/users/enums/role.enum";
import { ResponderType } from "@/modules/responders/enums/responder-type.enum";

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
	RESPONDING = "RESPONDING",
	RESOLVED = "RESOLVED",
	CLOSED = "CLOSED",
	ESCALATED = "ESCALATED",
}

export interface ContactInformation {
	email: string;
	phone: string;
	address: string;
}

export interface ITicket {
	ticketId: string;
	title: string;
	tier: ResponderType;
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
	assignedResponder?: {
		id: string;
		type: ResponderType;
	};
}

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

export interface ITicketLifecycleCreate
	extends Omit<ITicketLifecycle, "performedBy"> {
	performedByUser?: IUser;
	perfromedByAgent?: IAgent;
	performedByResponder?: IResponder;
}

export enum TicketSeverity {
	LOW = "LOW",
	MEDIUM = "MEDIUM",
	HIGH = "HIGH",
}

export type ITicketCreate = Omit<
	ITicket,
	"status" | "createdAt" | "updatedAt" | "severity" | "createdBy" | "tier"
> & {
	actorId: string;
	actorType: "agent" | "responder" | "admin";
	creatorRole: Role;
};

export type ITicketUpdate = Partial<ITicket>;
