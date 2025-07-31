import { Role } from "../enums/role.enum";
import { IUser } from "./user.interface";

export interface IUserRepository {
    findByEmail(email: string): Promise<IUser | null>;
    findById(id: string): Promise<IUser | null>;
    findAll(): Promise<IUser[]>;
    findUsersByRole(role: Role): Promise<IUser[]>;
    create(user: IUser): Promise<IUser>;
    update(user: IUser): Promise<IUser>;
    delete(id: string): Promise<boolean>;
}