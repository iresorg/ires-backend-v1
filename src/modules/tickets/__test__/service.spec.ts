import { Test, TestingModule } from "@nestjs/testing";
import { ITicketRepository } from "../interfaces/ticket-repo.interface";
import { TicketsService } from "../service";
import { createMock, DeepMocked } from "@golevelup/ts-jest";
import constants from "../constant";
import { ITicketCreate, TicketSeverity } from "../interfaces/ticket.interface";
import { TicketStatus } from "../interfaces/ticket.interface";
import { UsersService } from "@/modules/users/users.service";
import { Role } from "@/modules/users/enums/role.enum";
import { Status } from "@/modules/users/enums/status.enum";
import { faker } from "@faker-js/faker";

describe("TicketsService", () => {
	let ticketsService: TicketsService;
	let ticketsRepository: DeepMocked<ITicketRepository>;
	let usersService: DeepMocked<UsersService>;

	beforeEach(async () => {
		const moduleRef: TestingModule = await Test.createTestingModule({
			providers: [
				TicketsService,
				{
					provide: constants.TICKET_REPOSITORY,
					useValue: createMock<ITicketRepository>(),
				},
				UsersService,
			],
		}).compile();

		ticketsService = moduleRef.get(TicketsService);
		ticketsRepository = moduleRef.get(constants.TICKET_REPOSITORY);
		usersService = moduleRef.get(UsersService);
	});

	describe("createTicket", () => {
		it("should create a ticket", async () => {
			const ticket: Omit<ITicketCreate, "ticketId" | "performedBy"> = {
				title: "Test Ticket",
				type: "Test Type",
				description: "Test Description",
				location: "Test Location",
				reporterName: "Test Reporter",
				contactInformation: {
					email: "test@test.com",
					phone: "1234567890",
					address: "Test Address",
				},
				internalNotes: "Test Internal Notes",
				actorId: faker.string.uuid(),
				actorType: "admin",
			};

			const ticketId = "123";
			jest.spyOn(ticketsService, "generateTicketId").mockReturnValue(
				ticketId,
			);

			ticketsRepository.createTicket.mockResolvedValueOnce({
				...ticket,
				ticketId,
				status: TicketStatus.CREATED,
				createdAt: new Date(),
				updatedAt: new Date(),
			});

			usersService.findOne.mockResolvedValueOnce({
				id: "123",
				firstName: "Test",
				lastName: "User",
				email: "test@test.com",
				password: "password",
				role: Role.AGENT,
				status: Status.ACTIVE,
				avatar: "test.jpg",
				createdAt: new Date(),
				updatedAt: new Date(),
			});

			const result = await ticketsService.createTicket({
				...ticket,
				actorType: "admin",
				actorId: faker.string.uuid(),
			});

			expect(result).toBeDefined();
			expect(result.ticketId).toBe(ticketId);
			expect(result.status).toBe(TicketStatus.CREATED);
			expect(result.title).toBe(ticket.title);
			expect(result.type).toBe(ticket.type);
			expect(result.description).toBe(ticket.description);
			expect(result.location).toBe(ticket.location);
			expect(result.reporterName).toBe(ticket.reporterName);
			expect(result.contactInformation).toEqual(
				ticket.contactInformation,
			);
			expect(result.internalNotes).toBe(ticket.internalNotes);
		});
	});

	describe("getTicketById", () => {
		it("should not return one ID twice", () => {
			const idSize = 1000000;
			const ids = new Set();
			for (let i = 0; i < idSize; i++) {
				const id = ticketsService.generateTicketId();
				ids.add(id);
			}
			expect(ids.size).toBe(idSize);
		});
	});
});
