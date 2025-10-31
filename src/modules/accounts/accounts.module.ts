import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Account } from "./entities/account.entity";
import { IndividualProfile } from "./entities/individual-profile.entity";
import { OrganizationProfile } from "./entities/organization-profile.entity";
import { AccountsRepository } from "./repository/accounts.repository";
import { AccountsService } from "./services/accounts.service";
import { AccountsAuthController } from "./controllers/auth.controller";
import { UtilsModule } from "@/utils/utils.module";
import { AccountEmailVerification } from "./entities/email-verification.entity";
import { AccountPasswordReset } from "./entities/password-reset.entity";
import { AccountsAuthGuard } from "@/shared/guards/accounts-auth.guard";
import { EmailModule } from "@/shared/email/module";
import { FileUploadModule } from "../file-upload/module";

@Module({
	imports: [
		TypeOrmModule.forFeature([
			Account,
			IndividualProfile,
			OrganizationProfile,
			AccountEmailVerification,
			AccountPasswordReset,
		]),
		UtilsModule,
		EmailModule,
		FileUploadModule,
	],
	controllers: [AccountsAuthController],
	providers: [AccountsRepository, AccountsService, AccountsAuthGuard],
	exports: [AccountsService, AccountsRepository],
})
export class AccountsModule {}
