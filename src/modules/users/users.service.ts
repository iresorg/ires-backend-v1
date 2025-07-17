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
