export class AgentNotFoundError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "AgentNotFoundError";
	}
}

export class AgentAlreadyExistsError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "AgentAlreadyExistsError";
	}
}

export class AgentTokenError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "AgentTokenError";
	}
}
