export class UserNotFoundError extends Error {
	constructor(message: string = "User not found") {
		super(message);
		this.name = "UserNotFoundError";
	}
}

export class UserAlreadyExistsError extends Error {
	constructor(message: string = "User already exists") {
		super(message);
		this.name = "UserAlreadyExistsError";
	}
}
