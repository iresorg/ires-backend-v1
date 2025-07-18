import { Role } from "../enums/role.enum";
import { IUser, IUserCreate } from "./user.interface";

export interface IUserRepository {
	findByEmail(email: string): Promise<IUser | null>;
	findById(id: string): Promise<IUser | null>;
	findAll(filter: { role?: Role }): Promise<IUser[]>;
	findUsersByRole(role: Role): Promise<IUser[]>;
	findAllPaginated(skip: number, limit: number): Promise<[IUser[], number]>;
	findByRolePaginated(role: Role, skip: number, limit: number): Promise<[IUser[], number]>;
	findByRolesPaginated(roles: Role[], skip: number, limit: number): Promise<[IUser[], number]>;
	/**
	 * @throws {UserAlreadyExistsError}
	 */
	create(body: IUserCreate): Promise<IUser>;
	/**
	 * @throws {UserNotFoundError}
	 */
	update(id: string, user: Partial<IUser>): Promise<IUser>;
	/**
	 * @throws {UserNotFoundError}
	 * @throws {UserCannotBeDeletedError}
	 */
	delete(id: string): Promise<boolean>;
}
