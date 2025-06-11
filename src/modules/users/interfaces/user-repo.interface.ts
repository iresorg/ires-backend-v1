import { Role } from "../enums/role.enum";
import { IUser, IUserCreate } from "./user.interface";

export interface IUserRepository {
	findByEmail(email: string): Promise<IUser | null>;
	findById(id: string): Promise<IUser | null>;
	findAll(): Promise<IUser[]>;
	findUsersByRole(role: Role): Promise<IUser[]>;
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
