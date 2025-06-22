import {
	NotFoundException,
	ConflictException,
	UnauthorizedException,
} from "@nestjs/common";

export class AgentNotFoundError extends NotFoundException {
	constructor(message: string) {
		super(message);
	}
}

export class AgentAlreadyExistsError extends ConflictException {
	constructor(message: string) {
		super(message);
	}
}

export class AgentTokenError extends UnauthorizedException {
	constructor(message: string) {
		super(message);
	}
}
