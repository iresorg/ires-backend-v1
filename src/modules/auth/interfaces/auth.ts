import { Role } from "@/modules/users/enums/role.enum";

export interface UserAuthPayload {
	id: string;
	role: Role;
	email: string;
	type: "user";
}

export type AuthPayload = UserAuthPayload;
