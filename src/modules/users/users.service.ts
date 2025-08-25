import {
	ConflictException,
	Injectable,
	NotFoundException,
	ForbiddenException,
} from "@nestjs/common";
import type {
	IUser,
	IUserCreate,
	IUserUpdate,
} from "./interfaces/user.interface";
import { UserAlreadyExistsError, UserNotFoundError } from "@/shared/errors";
import { Utils } from "@/utils/utils";
import { EmailService } from "@/shared/email/service";
import { Logger } from "@/shared/logger/service";
import { Role } from "./enums/role.enum";
import { UserRepository } from "./users.repository";
import { FileUploadService } from "../file-upload/service";

@Injectable()
export class UsersService {
	constructor(
		private usersRepository: UserRepository,
		private readonly utils: Utils,
		private readonly emailService: EmailService,
		private readonly logger: Logger,
		private readonly fileUpload: FileUploadService,
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

	async findBySearch(search: string): Promise<IUser[]> {
		const users = await this.usersRepository.findBySearch(search);
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
	): Promise<{ users: IUser[]; total: number; totalPages: number }> {
		const skip = (page - 1) * limit;
		const [users, total] = await this.usersRepository.findAllPaginated(
			skip,
			limit,
		);
		const totalPages = Math.ceil(total / limit);

		return { users, total, totalPages };
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
		updateUserDto: Partial<IUserUpdate>,
		avatar?: Express.Multer.File
	): Promise<IUser | null> {
		const user = await this.usersRepository.findById(id);
		if (!user) throw new NotFoundException("User not found.");

		if (avatar) {
			const response = await this.fileUpload.uploadImage(avatar, user.avatar?.publicId);
			updateUserDto.avatar = {
				publicId: response.public_id,
				url: response.secure_url,
			}
		}
		// Restrict role update to admins only and prevent updating to SUPER_ADMIN
		if (
			updateUserDto.role &&
			![
				Role.SUPER_ADMIN,
				Role.AGENT_ADMIN,
				Role.RESPONDER_ADMIN,
			].includes(user.role)
		) {
			throw new ForbiddenException("Only admins can update user roles.");
		}
		if (updateUserDto.role === Role.SUPER_ADMIN) {
			throw new ForbiddenException(
				"Cannot update user to SUPER_ADMIN role.",
			);
		}

		const updatedUser = await this.usersRepository.update(
			id,
			updateUserDto
		);
		return updatedUser;
	}

	async create(createUserDto: Omit<IUserCreate, "password">, avatar?: Express.Multer.File): Promise<IUser> {
		try {
			const password = this.utils.generatePassword(8);

			if (avatar) {
				const response = await this.fileUpload.uploadImage(avatar);
				createUserDto.avatar = {
					publicId: response.public_id,
					url: response.secure_url,
				}
			}

			const user = await this.usersRepository.create({
				firstName: createUserDto.firstName,
				lastName: createUserDto.lastName,
				email: createUserDto.email,
				role: createUserDto.role,
				password: await this.utils.createHash(password),
				avatar: createUserDto.avatar
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
