import { Role } from "@/modules/users/enums/role.enum";

export interface AuthPayload {
	id: string;
	role: Role;
	email: string;
}
