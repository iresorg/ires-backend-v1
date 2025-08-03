import { HttpException, HttpStatus } from "@nestjs/common";

export class UserNotFoundError extends HttpException {
	constructor(message: string = "User not found") {
		super(message, HttpStatus.NOT_FOUND, {
			description: message,
		});
		this.name = "UserNotFoundError";
	}
}

export class UserAlreadyExistsError extends HttpException {
	constructor(message: string = "User already exists") {
		super(message, HttpStatus.CONFLICT, {
			description: message,
		});
		this.name = "UserAlreadyExistsError";
	}
}

export class InvalidCredentialsError extends HttpException {
	constructor(message: string = "Invalid credentials entered") {
		super(message, HttpStatus.UNAUTHORIZED, {
			description: message,
		});
		this.name = "InvalidCredentialsError";
	}
}

export class UserCannotBeDeletedError extends HttpException {
	constructor(message: string = "User cannot be deleted") {
		super(message, HttpStatus.BAD_REQUEST, {
			description: message,
		});
		this.name = "UserCannotBeDeletedError";
	}
}
