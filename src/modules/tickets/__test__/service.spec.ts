import { Test, TestingModule } from "@nestjs/testing";
import { ITicketRepository } from "../interfaces/ticket-repo.interface";
import { TicketsService } from "../service";
import { createMock, DeepMocked } from "@golevelup/ts-jest";
import constants from "../constant";
import { ITicketCreate } from "../interfaces/ticket.interface";
import { TicketStatus } from "../interfaces/ticket.interface";
import { UsersService } from "@/modules/users/users.service";
import { AgentsService } from "@/modules/agents/agents.service";
import { RespondersService } from "@/modules/responders/responders.service";
import { EmailService } from "@/shared/email/service";
import { Role } from "@/modules/users/enums/role.enum";
import { Status } from "@/modules/users/enums/status.enum";
import { faker } from "@faker-js/faker";
import { ResponderType } from "@/modules/responders/enums/responder-type.enum";

describe("TicketsService", () => {
	let ticketsService: TicketsService;
	let ticketsRepository: DeepMocked<ITicketRepository>;
	let usersService: DeepMocked<UsersService>;
	let _agentsService: DeepMocked<AgentsService>;
	let _respondersService: DeepMocked<RespondersService>;
	let emailService: DeepMocked<EmailService>;

	beforeEach(async () => {
		const moduleRef: TestingModule = await Test.createTestingModule({
			providers: [
				TicketsService,
				{
					provide: constants.TICKET_REPOSITORY,
					useValue: createMock<ITicketRepository>(),
				},
				{
					provide: UsersService,
					useValue: createMock<UsersService>(),
				},
				{
					provide: AgentsService,
					useValue: createMock<AgentsService>(),
				},
				{
					provide: RespondersService,
					useValue: createMock<RespondersService>(),
				},
				{
					provide: EmailService,
					useValue: createMock<EmailService>(),
				},
			],
		}).compile();

		ticketsService = moduleRef.get(TicketsService);
		ticketsRepository = moduleRef.get(constants.TICKET_REPOSITORY);
		usersService = moduleRef.get(UsersService);
		_agentsService = moduleRef.get(AgentsService);
		_respondersService = moduleRef.get(RespondersService);
		emailService = moduleRef.get(EmailService);
	});

	describe("createTicket", () => {
		it("should create a ticket", async () => {
			const ticket: Omit<ITicketCreate, "ticketId" | "performedBy"> = {
				title: "Test Ticket",
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
				creatorRole: Role.ADMIN,
			};

			const ticketId = "123";
			jest.spyOn(ticketsService, "generateTicketId").mockReturnValue(
				ticketId,
			);

			const mockCreatedTicket = {
				...ticket,
				ticketId,
				status: TicketStatus.CREATED,
				createdAt: new Date(),
				updatedAt: new Date(),
				createdBy: {
					id: "123",
					name: "Test User",
					role: Role.ADMIN,
				},
			};

			const mockSavedTicket = {
				...mockCreatedTicket,
			};

			ticketsRepository.createTicket.mockResolvedValueOnce({
				...mockCreatedTicket,
				tier: null,
			});
			ticketsRepository.getTicketById.mockResolvedValueOnce({
				...mockCreatedTicket,
				tier: null,
			});

			usersService.findOne.mockResolvedValueOnce({
				id: "123",
				firstName: "Test",
				lastName: "User",
				email: "test@test.com",
				password: "password",
				role: Role.ADMIN,
				status: Status.ACTIVE,
				avatar: "test.jpg",
				createdAt: new Date(),
				updatedAt: new Date(),
			});

			usersService.findAll.mockResolvedValueOnce([
				{
					id: "456",
					firstName: "Admin",
					lastName: "User",
					email: "admin@test.com",
					password: "password",
					role: Role.RESPONDER_ADMIN,
					status: Status.ACTIVE,
					avatar: "admin.jpg",
					createdAt: new Date(),
					updatedAt: new Date(),
				},
			]);

			emailService.sendNewTicketEmail.mockResolvedValueOnce(undefined);

			const result = await ticketsService.createTicket({
				...ticket,
				actorType: "admin",
				actorId: faker.string.uuid(),
			});

			expect(result).toBeDefined();
			expect(result.ticketId).toBe(ticketId);
			expect(result.status).toBe(TicketStatus.CREATED);
			expect(result.title).toBe(ticket.title);
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
