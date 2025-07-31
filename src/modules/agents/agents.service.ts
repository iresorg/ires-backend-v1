import { Injectable } from "@nestjs/common";
import { UsersService } from "../users/users.service";
import { Role } from "../users/enums/role.enum";
import { IUserCreate } from "../users/interfaces/user.interface";
import { CreateAgentDto } from "./dto/create-agent.dto";

@Injectable()
export class AgentsService {
	constructor(private readonly usersService: UsersService) {}

	async createAgent(createAgentDto: Omit<IUserCreate, "password">) {
		// Reuse user creation logic, always set role to AGENT
		return this.usersService.create({
			...createAgentDto,
			role: Role.AGENT,
		});
	}

	async findAgentsPaginated(page: number, limit: number) {
		// Reuse usersService to fetch only AGENT users
		const result = await this.usersService.findByRolePaginated(
			Role.AGENT,
			page,
			limit,
		);
		return { users: result.users, total: result.total };
	}

	async findAllAgents() {
		// Get all agents without pagination
		return this.usersService.findByRole(Role.AGENT);
	}

	async searchAgents(search: string) {
		// Search agents by name or email
		return await this.usersService.findByRoleAndSearch(Role.AGENT, search);
	}

	async findAgentById(id: string) {
		// Find a specific agent by ID
		const user = await this.usersService.findOne({ id });
		return user && user.role === Role.AGENT ? user : null;
	}

	async updateAgent(id: string, updateAgentDto: Partial<CreateAgentDto>) {
		// Update agent - ensure role remains AGENT
		const updateData = {
			...updateAgentDto,
			role: Role.AGENT, // Always ensure role is AGENT
		};
		return await this.usersService.update(id, updateData);
	}

	async deleteAgent(id: string) {
		// Delete agent
		return await this.usersService.delete(id);
	}

	async activateAgent(
		id: string,
		activatedBy: string,
		activatedByRole: Role,
	) {
		// Activate agent
		return await this.usersService.activateUser(
			id,
			activatedBy,
			activatedByRole,
		);
	}

	async deactivateAgent(
		id: string,
		deactivatedBy: string,
		deactivatedByRole: Role,
	) {
		// Deactivate agent
		return await this.usersService.deactivateUser(
			id,
			deactivatedBy,
			deactivatedByRole,
		);
	}
}
