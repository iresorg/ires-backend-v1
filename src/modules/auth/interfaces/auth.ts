import { Role } from "@/modules/users/enums/role.enum";

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

export type AuthPayload = UserAuthPayload | AgentAuthPayload;
