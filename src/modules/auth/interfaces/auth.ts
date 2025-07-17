import { Role } from "@/modules/users/enums/role.enum";
import { ResponderType } from "@/modules/responders/enums/responder-type.enum";

export interface UserAuthPayload {
	id: string;
	role: Role;
	email: string;
	type: "user";
}

export interface AgentAuthPayload {
	id: string;
	role: Role;
	agentId: string;
	type: "agent";
}

export interface ResponderAuthPayload {
	id: string;
	role: Role;
	responderId: string;
	type: ResponderType;
}

export type AuthPayload =
	| UserAuthPayload
	| AgentAuthPayload
	| ResponderAuthPayload;
