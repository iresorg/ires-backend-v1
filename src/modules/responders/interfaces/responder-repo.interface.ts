import {
	IResponder,
	IResponderCreate,
	IResponderToken,
	IResponderTokenCreate,
} from "./responder.interface";

export interface IResponderRepository {
	findById(responderId: string): Promise<IResponder | null>;
	findAll(): Promise<IResponder[]>;
	findActiveResponders(): Promise<IResponder[]>;
	findOnlineResponders(): Promise<IResponder[]>;
	/**
	 * @throws {ResponderAlreadyExistsError}
	 */
	create(body: IResponderCreate): Promise<IResponder>;
	/**
	 * @throws {ResponderNotFoundError}
	 */
	update(
		responderId: string,
		responder: Partial<IResponder>,
	): Promise<IResponder>;
	/**
	 * @throws {ResponderNotFoundError}
	 */
	delete(responderId: string): Promise<boolean>;
}

export interface IResponderTokenRepository {
	findActiveToken(responderId: string): Promise<IResponderToken | null>;
	/**
	 * @throws {ResponderNotFoundError}
	 */
	create(body: IResponderTokenCreate): Promise<IResponderToken>;
	/**
	 * @throws {ResponderNotFoundError}
	 */
	revokeToken(responderId: string): Promise<void>;
}
