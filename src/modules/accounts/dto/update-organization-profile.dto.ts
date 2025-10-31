import { IsOptional, IsString, IsIn } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { COMPANY_SIZES } from "../types/options";

export class UpdateOrganizationProfileDto {
	@ApiProperty({
		description: "Organization name",
		example: "Acme Corporation",
		required: false,
	})
	@IsOptional()
	@IsString()
	organizationName?: string;

	@ApiProperty({
		description: "Industry type",
		example: "Technology",
		required: false,
	})
	@IsOptional()
	@IsString()
	industryType?: string;

	@ApiProperty({
		description: "Company size",
		enum: COMPANY_SIZES,
		example: "51-200",
		required: false,
	})
	@IsOptional()
	@IsString()
	@IsIn(COMPANY_SIZES as readonly string[])
	companySize?: string;

	@ApiProperty({
		description: "Business address",
		example: "123 Business St, Suite 100",
		required: false,
	})
	@IsOptional()
	@IsString()
	businessAddress?: string;

	@ApiProperty({
		description: "City",
		example: "New York",
		required: false,
	})
	@IsOptional()
	@IsString()
	city?: string;

	@ApiProperty({
		description: "State/Province",
		example: "NY",
		required: false,
	})
	@IsOptional()
	@IsString()
	state?: string;

	@ApiProperty({
		description: "Country",
		example: "United States",
		required: false,
	})
	@IsOptional()
	@IsString()
	country?: string;

	@ApiProperty({
		description: "Organization phone number",
		example: "+1234567890",
		required: false,
	})
	@IsOptional()
	@IsString()
	phoneNumber?: string;

	@ApiProperty({
		description: "Primary contact first name",
		example: "Jane",
		required: false,
	})
	@IsOptional()
	@IsString()
	primaryContactFirstName?: string;

	@ApiProperty({
		description: "Primary contact last name",
		example: "Smith",
		required: false,
	})
	@IsOptional()
	@IsString()
	primaryContactLastName?: string;

	@ApiProperty({
		description: "Primary contact job title",
		example: "IT Manager",
		required: false,
	})
	@IsOptional()
	@IsString()
	primaryContactJobTitle?: string;

	@ApiProperty({
		description: "Primary contact email",
		example: "jane@company.com",
		required: false,
	})
	@IsOptional()
	@IsString()
	primaryContactEmail?: string;

	@ApiProperty({
		description: "Primary contact phone number",
		example: "+1234567890",
		required: false,
	})
	@IsOptional()
	@IsString()
	primaryContactPhoneNumber?: string;
}
