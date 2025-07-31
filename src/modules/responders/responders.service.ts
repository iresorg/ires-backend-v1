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

	async findRespondersPaginated(page: number, limit: number) {
		// Fetch both responder tiers
		return this.usersService.findByRolesPaginated(
			[Role.RESPONDER_TIER_1, Role.RESPONDER_TIER_2],
			page,
			limit,
		);
	}

	async searchResponders(search: string) {
		// Search responders by name or email
		// For now, we'll search in both responder tiers
		const tier1Responders = await this.usersService.findByRoleAndSearch(
			Role.RESPONDER_TIER_1,
			search,
		);
		const tier2Responders = await this.usersService.findByRoleAndSearch(
			Role.RESPONDER_TIER_2,
			search,
		);
		return [...tier1Responders, ...tier2Responders];
	}
}
