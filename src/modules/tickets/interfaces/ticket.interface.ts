import { IUser } from "@/modules/users/interfaces/user.interface";
import { IAgent } from "@/modules/agents/interfaces/agent.interface";
import { IResponder } from "@/modules/responders/interfaces/responder.interface";
import { Role } from "@/modules/users/enums/role.enum";

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
	type: string;
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
		name?: string;
		role: Role;
	};
}

export enum TicketLifecycleAction {
	CREATE = "create",
	UPDATE = "update",
	DELETE = "delete",
}

export interface ITicketLifecycle {
	ticketId: string;
	action: TicketLifecycleAction;
	performedByUser?: IUser;
	perfromedByAgent?: IAgent;
	performedByResponder?: IResponder;
	notes: string;
	createdAt: Date;
}

export enum TicketSeverity {
	LOW = "LOW",
	MEDIUM = "MEDIUM",
	HIGH = "HIGH",
}

export type ITicketCreate = Omit<
	ITicket,
	"status" | "createdAt" | "updatedAt" | "severity" | "createdBy"
> & {
	actorId: string;
	actorType: "agent" | "responder" | "admin";
	creatorRole: Role;
};

export type ITicketUpdate = Partial<ITicket>;
