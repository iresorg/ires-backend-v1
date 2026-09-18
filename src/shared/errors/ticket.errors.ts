import { HttpException, HttpStatus } from "@nestjs/common";

export class TicketNotFoundError extends HttpException {
	constructor(message: string = "Ticket not found") {
		super(message, HttpStatus.NOT_FOUND, {
			description: message,
		});
		this.name = "TicketNotFoundError";
	}
}

export class TicketEscalationReasonRequiredError extends HttpException {
	constructor(message: string = "Escalation reason is required") {
		super(message, HttpStatus.BAD_REQUEST, {
			description: message,
		});
		this.name = "TicketEscalationReasonRequiredError";
	}
}

export class TicketUpdateError extends HttpException {
	constructor(message: string = "Ticket could not be updated") {
		super(message, HttpStatus.BAD_REQUEST, {
			description: message,
		});
		this.name = "TicketUpdateError";
	}
}

export class InappropriateTierError extends HttpException {
	constructor(message: string = "Inappropriate tier") {
		super(message, HttpStatus.BAD_REQUEST, {
			description: message,
		});
		this.name = "InappropriateTierError";
	}
}

export class TicketCategoryNotFoundError extends HttpException {
	constructor(message = "Ticket category not found") {
		super(message, HttpStatus.NOT_FOUND, {
			description: message,
		});
		this.name = "TicketCategoryNotFoundError";
	}
}

export class TicketAccountNotEligibleError extends HttpException {
	constructor(
		message = "Account is not eligible to have a ticket created. Active subscription with remaining incidents or unused pay-as-you-go credit required.",
	) {
		super(message, HttpStatus.FORBIDDEN, {
			description: message,
		});
		this.name = "TicketAccountNotEligibleError";
	}
}

export class TicketAccountNotFoundError extends HttpException {
	constructor(message = "Customer account not found") {
		super(message, HttpStatus.NOT_FOUND, {
			description: message,
		});
		this.name = "TicketAccountNotFoundError";
	}
}
