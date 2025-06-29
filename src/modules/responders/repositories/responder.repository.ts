import { Repository, MoreThan } from "typeorm";
import { Responder } from "../entities/responder.entity";
import { ResponderToken } from "../entities/responder-token.entity";
import { Injectable, ConflictException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import {
	IResponderRepository,
	IResponderTokenRepository,
} from "../interfaces/responder-repo.interface";
import {
	IResponder,
	IResponderCreate,
	IResponderUpdate,
} from "../interfaces/responder.interface";
import { ResponderNotFoundError } from "@/shared/errors/responder.errors";

@Injectable()
export class ResponderRepository implements IResponderRepository {
	constructor(
		@InjectRepository(Responder)
		private repository: Repository<Responder>,
	) {}

	async create(data: IResponderCreate): Promise<IResponder> {
		const responder = this.repository.create(data);
		return this.repository.save(responder);
	}

	async findAll(): Promise<IResponder[]> {
		return this.repository.find();
	}

	async findActiveResponders(): Promise<IResponder[]> {
		return this.repository.find({ where: { isActive: true } });
	}

	async findOnlineResponders(): Promise<IResponder[]> {
		return this.repository.find({ where: { isOnline: true } });
	}

	async findById(responderId: string): Promise<IResponder | null> {
		return this.repository.findOne({ where: { responderId } });
	}

	async update(
		responderId: string,
		data: IResponderUpdate,
	): Promise<IResponder> {
		const result = await this.repository.update({ responderId }, data);
		if (result.affected === 0) {
			throw new ResponderNotFoundError(
				`Responder with id ${responderId} not found`,
			);
		}
		const updatedResponder = await this.findById(responderId);
		if (!updatedResponder) {
			throw new ResponderNotFoundError(
				`Responder with id ${responderId} not found after update`,
			);
		}
		return updatedResponder;
	}

	async delete(responderId: string): Promise<boolean> {
		const result = await this.repository.delete({ responderId });
		if (result.affected === 0)
			throw new ResponderNotFoundError(
				`Responder with id ${responderId} not found.`,
			);
		return true;
	}
}

@Injectable()
export class ResponderTokenRepository implements IResponderTokenRepository {
	constructor(
		@InjectRepository(ResponderToken)
		private repository: Repository<ResponderToken>,
	) {}

	async create(data: {
		responderId: string;
		tokenHash: string;
		encryptedToken: string;
		expiresAt: Date;
	}): Promise<ResponderToken> {
		try {
			const token = this.repository.create(data);
			return await this.repository.save(token);
		} catch (error: any) {
			// Handle database constraint violations
			if ((error as { code?: string })?.code === "23505") {
				// PostgreSQL unique constraint violation
				throw new ConflictException(
					"Token already exists for this responder. Please revoke existing token first.",
				);
			}
			if ((error as { code?: string })?.code === "23503") {
				// PostgreSQL foreign key constraint violation
				throw new ConflictException("Responder not found.");
			}
			// Re-throw other database errors
			throw error;
		}
	}

	async findActiveToken(responderId: string): Promise<ResponderToken | null> {
		return this.repository.findOne({
			where: {
				responderId,
				isRevoked: false,
				expiresAt: MoreThan(new Date()),
			},
		});
	}

	async revokeToken(responderId: string): Promise<void> {
		await this.repository.delete({ responderId });
	}
}
