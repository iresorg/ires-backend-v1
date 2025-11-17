import { ApiProperty } from "@nestjs/swagger";

export class UserResponseDto {
	@ApiProperty({ description: "User account ID", example: "uuid-string" })
	id: string;

	@ApiProperty({ description: "User full name", example: "John Doe" })
	name: string;

	@ApiProperty({ description: "User email", example: "john@example.com" })
	email: string;

	@ApiProperty({
		description: "Account role",
		enum: ["individual", "organization"],
		example: "individual",
	})
	role: string;

	@ApiProperty({
		description: "Email verification status",
		example: true,
	})
	emailVerified: boolean;

	@ApiProperty({
		description: "Phone number",
		example: "+1234567890",
		nullable: true,
	})
	phone: string | null;

	@ApiProperty({
		description: "Account creation date",
		example: "2024-01-01T00:00:00.000Z",
	})
	joinedDate: Date;

	static fromAccount(account: any): UserResponseDto {
		let name = account.email;
		let phone: string | null = null;

		if (account.role === "individual" && account.individualProfile) {
			name = `${account.individualProfile.firstName} ${account.individualProfile.lastName}`;
			phone = account.individualProfile.phoneNumber;
		} else if (
			account.role === "organization" &&
			account.organizationProfile
		) {
			name = account.organizationProfile.organizationName;
			phone = account.organizationProfile.phoneNumber;
		}

		return {
			id: account.id,
			name,
			email: account.email,
			role: account.role,
			emailVerified: !!account.emailVerifiedAt,
			phone,
			joinedDate: account.createdAt,
		};
	}

	static fromAccounts(accounts: any[]): UserResponseDto[] {
		return accounts.map((account) => this.fromAccount(account));
	}
}
