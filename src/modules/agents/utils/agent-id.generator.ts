import { IAgentRepository } from "../interfaces/agent-repo.interface";
import { IAgent } from "../interfaces/agent.interface";

export async function generateUniqueAgentId(
	agentRepository: IAgentRepository,
): Promise<string> {
	const prefix = "AGNT";
	const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
	let agentId: string;
	let existingAgent: IAgent | null;

	do {
		// Generate a random number between 100 and 999
		const numbers = Math.floor(Math.random() * 900) + 100;
		// Pick a random letter
		const letter = letters[Math.floor(Math.random() * letters.length)];

		agentId = `${prefix}${numbers}${letter}`;
		existingAgent = await agentRepository.findById(agentId);
	} while (existingAgent);

	return agentId;
}
