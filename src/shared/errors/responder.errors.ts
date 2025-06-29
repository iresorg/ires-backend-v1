export class ResponderNotFoundError extends Error {
    constructor(message = "Responder not found") {
        super(message);
        this.name = "ResponderNotFoundError";
    }
}

export class ResponderAlreadyExistsError extends Error {
    constructor(message = "Responder already exists") {
        super(message);
        this.name = "ResponderAlreadyExistsError";
    }
} 