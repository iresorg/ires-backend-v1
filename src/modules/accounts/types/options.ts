export const ACCOUNT_ROLES = ["individual", "organization"] as const;
export type AccountRole = (typeof ACCOUNT_ROLES)[number];

export const COMPANY_SIZES = [
	"1-10",
	"11-50",
	"51-200",
	"200-500",
	"500-1000",
	"1000+",
] as const;
export type CompanySize = (typeof COMPANY_SIZES)[number];

export const ACCOUNT_STATUSES = ["active", "suspended"] as const;
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];
