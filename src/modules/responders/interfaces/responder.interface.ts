import { ResponderType } from "../enums/responder-type.enum";

export interface IResponder {
	responderId: string;
	type: ResponderType;
	isActive: boolean;
	isOnline: boolean;
	lastSeen: Date | null;
	lastStatusChangeAt: Date | null;
	createdAt: Date;
	updatedAt: Date;
}

export interface IResponderCreate {
	responderId: string;
	type: ResponderType;
	lastSeen?: Date | null;
}

export interface IResponderUpdate {
	type?: ResponderType;
	isActive?: boolean;
	isOnline?: boolean;
	lastSeen?: Date | null;
	lastStatusChangeAt?: Date | null;
}

export type IResponderFind = IResponder;

export interface IResponderToken {
	tokenHash: string;
	responderId: string;
	expiresAt: Date;
	isRevoked: boolean;
	createdAt: Date;
	updatedAt: Date;
	encryptedToken: string;
}

export interface IResponderTokenCreate {
	responderId: string;
	tokenHash: string;
	encryptedToken: string;
	expiresAt: Date;
}
