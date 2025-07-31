import {
	ConflictException,
	Inject,
	Injectable,
	NotFoundException,
} from "@nestjs/common";
import type {
	IUser,
	IUserCreate,
	IUserUpdate,
} from "./interfaces/user.interface";
import { UserAlreadyExistsError, UserNotFoundError } from "@/shared/errors";
import { IUserRepository } from "./interfaces/user-repo.interface";
import constants from "./constants/constants";
import { Utils } from "@/utils/utils";
import { EmailService } from "@/shared/email/service";
import { Logger } from "@/shared/logger/service";
import { Role } from "./enums/role.enum";

@Injectable()
export class UsersService {
	constructor(
		@Inject(constants.USER_REPOSITORY)
		private usersRepository: IUserRepository,
		private readonly utils: Utils,
		private readonly emailService: EmailService,
		private readonly logger: Logger,
	) {}

	async findAll(filter: { role?: Role } = {}): Promise<IUser[]> {
		const users = await this.usersRepository.findAll(filter);
		return users;
	}

	async findByRole(role: Role): Promise<IUser[]> {
		const users = await this.usersRepository.findUsersByRole(role);
		return users;
	}

	async findByRoleAndSearch(role: Role, search: string): Promise<IUser[]> {
		const users = await this.usersRepository.findByRoleAndSearch(
			role,
			search,
		);
		return users;
	}

	async findByRoles(roles: Role[]): Promise<IUser[]> {
		// For now, we'll fetch users by each role and combine them
		// This can be optimized later by adding a findByRoles method to the repository
		const allUsers: IUser[] = [];
		for (const role of roles) {
			const users = await this.usersRepository.findUsersByRole(role);
			allUsers.push(...users);
		}
		return allUsers;
	}

	async findAllPaginated(
		page: number,
		limit: number,
		filters?: { role?: Role; search?: string },
	): Promise<{ users: IUser[]; total: number; totalPages: number }> {
		const skip = (page - 1) * limit;

		// If we have filters, use the appropriate method
		if (filters?.role && filters?.search) {
			// Both role and search filters
			const users = await this.findByRoleAndSearch(
				filters.role,
				filters.search,
			);
			const total = users.length;
			const totalPages = Math.ceil(total / limit);
			const paginatedUsers = users.slice(skip, skip + limit);
			return { users: paginatedUsers, total, totalPages };
		} else if (filters?.role) {
			// Only role filter
			const [users, total] =
				await this.usersRepository.findByRolePaginated(
					filters.role,
					skip,
					limit,
				);
			const totalPages = Math.ceil(total / limit);
			return { users, total, totalPages };
		} else if (filters?.search) {
			// Only search filter
			const users = await this.usersRepository.findBySearch(
				filters.search,
			);
			const total = users.length;
			const totalPages = Math.ceil(total / limit);
			const paginatedUsers = users.slice(skip, skip + limit);
			return { users: paginatedUsers, total, totalPages };
		} else {
			// No filters - use default pagination
			const [users, total] = await this.usersRepository.findAllPaginated(
				skip,
				limit,
			);
			const totalPages = Math.ceil(total / limit);
			return { users, total, totalPages };
		}
	}

	async findByRolePaginated(
		role: Role,
		page: number,
		limit: number,
	): Promise<{ users: IUser[]; total: number; totalPages: number }> {
		const skip = (page - 1) * limit;
		const [users, total] = await this.usersRepository.findByRolePaginated(
			role,
			skip,
			limit,
		);
		const totalPages = Math.ceil(total / limit);

		return { users, total, totalPages };
	}

	async findByRolesPaginated(
		roles: Role[],
		page: number,
		limit: number,
	): Promise<{ users: IUser[]; total: number; totalPages: number }> {
		const skip = (page - 1) * limit;
		const [users, total] = await this.usersRepository.findByRolesPaginated(
			roles,
			skip,
			limit,
		);
		const totalPages = Math.ceil(total / limit);

		return { users, total, totalPages };
	}

	async findOne(filter: {
		id?: string;
		email?: string;
	}): Promise<IUser | null> {
		if (filter.id) {
			return this.usersRepository.findById(filter.id);
		}
		if (filter.email) {
			return this.usersRepository.findByEmail(filter.email);
		}
	}

	async update(
		id: string,
		updateUserDto: IUserUpdate,
	): Promise<IUser | null> {
		const user = await this.usersRepository.findById(id);
		if (!user) throw new NotFoundException("User not found.");
		try {
			const updatedUser = await this.usersRepository.update(
				id,
				updateUserDto,
			);
			return updatedUser;
		} catch (error) {
			if (error instanceof UserNotFoundError) {
				throw new NotFoundException("User not found.");
			}
			throw error;
		}
	}

	async create(createUserDto: Omit<IUserCreate, "password">): Promise<IUser> {
		try {
			const password = this.utils.generatePassword(8);

			const user = await this.usersRepository.create({
				firstName: createUserDto.firstName,
				lastName: createUserDto.lastName,
				email: createUserDto.email,
				role: createUserDto.role,
				password: await this.utils.createHash(password),
			});

			await this.emailService.sendWelcomeEmail(
				user.email,
				password,
				`${user.firstName} ${user.lastName}`,
			);

			return user;
		} catch (error) {
			if (error instanceof UserAlreadyExistsError) {
				throw new ConflictException(
					"User with this email already exists. Please check and try again later.",
				);
			}

			throw error;
		}
	}

	async delete(id: string): Promise<boolean> {
		const user = await this.usersRepository.findById(id);
		if (!user) throw new UserNotFoundError();

		return await this.usersRepository.delete(id);
	}

	async activateUser(
		userId: string,
		activatedBy: string,
		activatedByRole: Role,
	): Promise<IUser> {
		let user = await this.usersRepository.findById(userId);
		if (!user) throw new UserNotFoundError();

		user = await this.usersRepository.update(userId, { status: "active" });

		this.logger.log(
			`User ${user.email} activated by ${activatedBy} with role ${activatedByRole}`,
			{
				activatedUserId: userId,
				activatedByUserId: activatedBy,
				activatedByRole: activatedByRole,
				timestamp: new Date().toISOString(),
			},
		);

		return user;
	}

	async deactivateUser(
		userId: string,
		deactivatedBy: string,
		deactivatedByRole: Role,
	): Promise<IUser> {
		let user = await this.usersRepository.findById(userId);
		if (!user) throw new UserNotFoundError();

		user = await this.usersRepository.update(userId, {
			status: "deactivated",
		});

		this.logger.log(
			`User ${user.email} deactivated by ${deactivatedBy} with role ${deactivatedByRole}`,
			{
				deactivatedUserId: userId,
				deactivatedByUserId: deactivatedBy,
				deactivatedByRole: deactivatedByRole,
				timestamp: new Date().toISOString(),
			},
		);

		return user;
	}
}
