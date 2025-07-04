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
