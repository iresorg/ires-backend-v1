import { Injectable } from "@nestjs/common";
import { IUserRepository } from "./interfaces/user-repo.interface";
import { Role } from "./enums/role.enum";
import { IUser, IUserCreate } from "./interfaces/user.interface";
import { User } from "./entities/user.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, In } from "typeorm";
import { UserAlreadyExistsError, UserNotFoundError } from "@/shared/errors";

@Injectable()
export class UserRepository implements IUserRepository {
	constructor(
		@InjectRepository(User)
		private readonly userRepo: Repository<User>,
	) {}

	async findByEmail(email: string): Promise<IUser | null> {
		const user = await this.userRepo.findOne({ where: { email } });

		return user ? this.mapToIUser(user) : null;
	}

	async findById(id: string): Promise<IUser | null> {
		const user = await this.userRepo.findOne({ where: { id } });
		return user ? this.mapToIUser(user) : null;
	}

	async findAll(): Promise<IUser[]> {
		const users = await this.userRepo.find({
			order: { createdAt: "DESC" },
		});
		return users.map((user) => this.mapToIUser(user));
	}

	async findUsersByRole(role: Role): Promise<IUser[]> {
		const users = await this.userRepo.find({
			where: { role },
			order: { createdAt: "DESC" },
		});

		return users.map((user) => this.mapToIUser(user));
	}

	async findAllPaginated(skip: number, limit: number): Promise<[IUser[], number]> {
		const [users, total] = await this.userRepo.findAndCount({
			order: { createdAt: "DESC" },
			skip,
			take: limit,
		});

		return [users.map((user) => this.mapToIUser(user)), total];
	}

	async findByRolePaginated(
		role: Role,
		skip: number,
		limit: number,
	): Promise<[IUser[], number]> {
		const [users, total] = await this.userRepo.findAndCount({
			where: { role },
			order: { createdAt: "DESC" },
			skip,
			take: limit,
		});

		return [users.map((user) => this.mapToIUser(user)), total];
	}

	async findByRolesPaginated(
		roles: Role[],
		skip: number,
		limit: number,
	): Promise<[IUser[], number]> {
		const [users, total] = await this.userRepo.findAndCount({
			where: { role: In(roles) },
			order: { createdAt: "DESC" },
			skip,
			take: limit,
		});

		return [users.map((user) => this.mapToIUser(user)), total];
	}

	async create(body: IUserCreate): Promise<IUser> {
		const { email, firstName, lastName, password, role, avatar } = body;

		const existingUser = await this.findByEmail(email);

		if (existingUser) {
			throw new UserAlreadyExistsError(
				`User with email ${email} already exists.`,
			);
		}

		const newUser = this.userRepo.create({
			email,
			firstName,
			lastName,
			password,
			role,
			avatar,
		});

		const savedUser = await this.userRepo.save(newUser);
		return this.mapToIUser(savedUser);
	}

	async update(id: string, body: Partial<IUser>): Promise<IUser> {
		const savedUser = await this.userRepo.update(
			{ id },
			{ ...(body as User) },
		);
		if (savedUser.affected === 0)
			throw new UserNotFoundError(`User with id ${id} not found.`);

		const updatedUser = await this.userRepo.findOne({ where: { id } });
		if (!updatedUser)
			throw new UserNotFoundError(
				`User with id ${id} not found after update.`,
			);
		return this.mapToIUser(updatedUser);
	}

	async delete(id: string): Promise<boolean> {
		const result = await this.userRepo.delete(id);
		if (result.affected === 0)
			throw new UserNotFoundError(`User with id ${id} not found.`);
		return true;
	}

	private mapToIUser(data: User): IUser {
		return {
			id: data.id,
			firstName: data.firstName,
			lastName: data.lastName,
			email: data.email,
			password: data.password,
			role: data.role,
			status: data.status,
			avatar: data.avatar,
			createdAt: data.createdAt,
			updatedAt: data.updatedAt,
			lastLogin: data.lastLogin,
		};
	}
}
