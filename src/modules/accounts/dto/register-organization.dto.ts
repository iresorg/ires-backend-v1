import { IsEmail, IsIn, IsString, MinLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { ACCOUNT_ROLES, COMPANY_SIZES } from "../types/options";

export class RegisterOrganizationDto {
	@ApiProperty({
		description: "Organization email address",
		example: "contact@company.com",
	})
	@IsEmail()
	email: string;

	@ApiProperty({
		description: "Account password (minimum 6 characters)",
		example: "securePassword123",
		minLength: 6,
	})
	@IsString()
	@MinLength(6)
	password: string;

	@ApiProperty({
		description: "Account role",
		enum: ACCOUNT_ROLES,
		example: "organization",
	})
	@IsString()
	@IsIn(ACCOUNT_ROLES as readonly string[])
	role: string;

	@ApiProperty({
		description: "Organization name",
		example: "Acme Corporation",
	})
	@IsString()
	organizationName: string;

	@ApiProperty({
		description: "Industry type",
		example: "Technology",
	})
	@IsString()
	industryType: string;

	@ApiProperty({
		description: "Company size",
		enum: COMPANY_SIZES,
		example: "51-200",
	})
	@IsString()
	@IsIn(COMPANY_SIZES as readonly string[])
	companySize: string;

	@ApiProperty({
		description: "Business address",
		example: "123 Business St, Suite 100",
	})
	@IsString()
	businessAddress: string;

	@ApiProperty({
		description: "City",
		example: "New York",
	})
	@IsString()
	city: string;

	@ApiProperty({
		description: "State/Province",
		example: "NY",
	})
	@IsString()
	state: string;

	@ApiProperty({
		description: "Country",
		example: "United States",
	})
	@IsString()
	country: string;

	@ApiProperty({
		description: "Organization phone number",
		example: "+1234567890",
	})
	@IsString()
	phoneNumber: string;

	@ApiProperty({
		description: "Primary contact first name",
		example: "Jane",
	})
	@IsString()
	primaryContactFirstName: string;

	@ApiProperty({
		description: "Primary contact last name",
		example: "Smith",
	})
	@IsString()
	primaryContactLastName: string;

	@ApiProperty({
		description: "Primary contact job title",
		example: "IT Manager",
	})
	@IsString()
	primaryContactJobTitle: string;

	@ApiProperty({
		description: "Primary contact email",
		example: "jane.smith@company.com",
	})
	@IsEmail()
	primaryContactEmail: string;

	@ApiProperty({
		description: "Primary contact phone number",
		example: "+1234567890",
	})
	@IsString()
	primaryContactPhoneNumber: string;
}
