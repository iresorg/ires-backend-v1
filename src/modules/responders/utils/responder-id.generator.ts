import { IResponderRepository } from "../interfaces/responder-repo.interface";
import { IResponder } from "../interfaces/responder.interface";

export async function generateUniqueResponderId(
	responderRepository: IResponderRepository,
): Promise<string> {
	const prefix = "RESP";
	const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
	let responderId: string;
	let existingResponder: IResponder | null;

	do {
		// Generate a random number between 100 and 999
		const numbers = Math.floor(Math.random() * 900) + 100;
		// Pick a random letter
		const letter = letters[Math.floor(Math.random() * letters.length)];

		responderId = `${prefix}${numbers}${letter}`;
		existingResponder = await responderRepository.findById(responderId);
	} while (existingResponder);

	return responderId;
}
