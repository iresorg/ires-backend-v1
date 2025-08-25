import { Injectable } from "@nestjs/common";
import { UsersService } from "../users/users.service";
import { Role } from "../users/enums/role.enum";
import { IUserCreate, IUserUpdate } from "../users/interfaces/user.interface";

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

	async findAllResponders() {
		return this.usersService.findByRoles([
			Role.RESPONDER_TIER_1,
			Role.RESPONDER_TIER_2,
		]);
	}

	async findResponderById(id: string) {
		const user = await this.usersService.findOne({ id });
		if (
			user &&
			[Role.RESPONDER_TIER_1, Role.RESPONDER_TIER_2].includes(user.role)
		) {
			return user;
		}
		return null;
	}

	async searchResponders(search: string) {
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

	async findRespondersPaginated(limit: number, offset: number) {
		// Fetch both responder tiers
		return this.usersService.findByRolesPaginated(
			[Role.RESPONDER_TIER_1, Role.RESPONDER_TIER_2],
			Math.floor(offset / limit) + 1,
			limit,
		);
	}

	async updateResponder(
		id: string,
		updateResponderDto: Partial<IUserUpdate>,
	) {
		const existingResponder = await this.findResponderById(id);
		if (!existingResponder) {
			throw new Error("Responder not found");
		}

		// Ensure the role remains a responder role
		if (
			updateResponderDto.role &&
			![Role.RESPONDER_TIER_1, Role.RESPONDER_TIER_2].includes(
				updateResponderDto.role,
			)
		) {
			throw new Error("Invalid responder role");
		}

		return this.usersService.update(id, updateResponderDto);
	}

	async deleteResponder(id: string) {
		const existingResponder = await this.findResponderById(id);
		if (!existingResponder) {
			throw new Error("Responder not found");
		}

		return this.usersService.delete(id);
	}

	async activateResponder(
		userId: string,
		activatedBy: string,
		activatedByRole: Role,
	) {
		const existingResponder = await this.findResponderById(userId);
		if (!existingResponder) {
			throw new Error("Responder not found");
		}

		return this.usersService.activateUser(
			userId,
			activatedBy,
			activatedByRole,
		);
	}

	async deactivateResponder(
		userId: string,
		deactivatedBy: string,
		deactivatedByRole: Role,
	) {
		const existingResponder = await this.findResponderById(userId);
		if (!existingResponder) {
			throw new Error("Responder not found");
		}

		return this.usersService.deactivateUser(
			userId,
			deactivatedBy,
			deactivatedByRole,
		);
	}
}
