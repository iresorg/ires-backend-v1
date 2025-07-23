import { Injectable } from "@nestjs/common";
import { UsersService } from "../users/users.service";
import { Role } from "../users/enums/role.enum";
import { IUserCreate } from "../users/interfaces/user.interface";

@Injectable()
export class RespondersService {
	constructor(private readonly usersService: UsersService) {}

	async createResponder(createResponderDto: Omit<IUserCreate, "password">) {
		// Only allow RESPONDER_TIER_1 or RESPONDER_TIER_2
		if (
			![Role.RESPONDER_TIER_1, Role.RESPONDER_TIER_2].includes(
				createResponderDto.role,
			)
		) {
			throw new Error("Invalid responder role");
		}
		return this.usersService.create({
			...createResponderDto,
			role: createResponderDto.role,
		});
	}

	async findRespondersPaginated(limit: number, offset: number) {
		// Fetch both responder tiers
		return this.usersService.findByRolesPaginated(
			[Role.RESPONDER_TIER_1, Role.RESPONDER_TIER_2],
			limit,
			offset,
		);
	}
}
