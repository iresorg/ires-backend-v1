import { Injectable } from "@nestjs/common";
import { UsersService } from "../users/users.service";
import { Role } from "../users/enums/role.enum";
import { IUserCreate } from "../users/interfaces/user.interface";

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

	async findAgentsPaginated(limit: number, offset: number) {
		// Reuse usersService to fetch only AGENT users
		return this.usersService.findByRolePaginated(Role.AGENT, limit, offset);
	}
}
