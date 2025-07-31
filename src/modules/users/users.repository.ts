import { Injectable } from "@nestjs/common";
import { IUserRepository } from "./interfaces/user-repo.interface";
import { Role } from "./enums/role.enum";
import { IUser } from "./interfaces/user.interface";

@Injectable()
export class UserRepository implements IUserRepository {
    findByEmail(email: string): Promise<IUser | null> {
        throw new Error("Method not implemented.");
    }
    findById(id: string): Promise<IUser | null> {
        throw new Error("Method not implemented.");
    }
    findAll(): Promise<IUser[]> {
        throw new Error("Method not implemented.");
    }
    findUsersByRole(role: Role): Promise<IUser[]> {
        throw new Error("Method not implemented.");
    }
    create(user: IUser): Promise<IUser> {
        throw new Error("Method not implemented.");
    }
    update(user: IUser): Promise<IUser> {
        throw new Error("Method not implemented.");
    }
    delete(id: string): Promise<boolean> {
        throw new Error("Method not implemented.");
    }
}