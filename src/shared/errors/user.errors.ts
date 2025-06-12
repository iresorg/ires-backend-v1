export class UserNotFoundError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "UserNotFoundError";
	}
}

export class UserAlreadyExistsError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "UserAlreadyExistsError";
	}
}

export class UserCannotBeDeletedError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "UserCannotBeDeletedError";
	}
}
