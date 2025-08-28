import { Role } from "../enums/role.enum";

export interface IUser {
	id: string;
	firstName: string;
	lastName: string;
	email: string;
	password: string;
	role: Role;
	status: string;
	avatar: {
		publicId: string;
		url: string;
	};
	createdAt: Date;
	updatedAt: Date;
	deletedAt?: Date;
	lastLogin?: Date;
}

export interface IUserCreate {
	firstName: string;
	lastName: string;
	email: string;
	password: string;
	role: Role;
	avatar?: {
		publicId: string;
		url: string;
	};
}

export type IUserUpdate = IUserCreate &{
	status?: string;
}

export type IUserFind = Omit<IUser, "password">;
