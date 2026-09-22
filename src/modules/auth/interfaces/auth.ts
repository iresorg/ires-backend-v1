import { Role } from "@/modules/users/enums/role.enum";

export interface UserAuthPayload {
	id: string;
	role: Role;
	email: string;
	type: "user";
	tv?: number;
}

export type AuthPayload = UserAuthPayload;
