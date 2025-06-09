import { Role } from "@/modules/users/enums/role.enum"
import { SetMetadata } from "@nestjs/common"

export const ROLES_KEY = "roles" as const;
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);