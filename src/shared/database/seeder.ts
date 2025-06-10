import { Injectable } from "@nestjs/common";
import { DataSource } from "typeorm";
import { User } from "@/modules/users/entities/user.entity";
import { Role } from "@/modules/users/enums/role.enum";
import * as bcrypt from 'bcrypt';
import { EnvVariables } from "@/utils/env.validate";
import { AppDataSource, env } from "./datasource";

@Injectable()
export class Seeder {
    constructor(
        private readonly dataSource: DataSource,
        private readonly env: EnvVariables
    ) {}

    async seed() {
        if (!this.dataSource.isInitialized) {
            await this.dataSource.initialize();
        }
        await this.seedSuperAdmin();

        await this.dataSource.destroy();
    }

    async seedSuperAdmin() {
        const userRepository = this.dataSource.getRepository(User);
        const superAdmin = await userRepository.findOne({
            where: {
                role: Role.SUPER_ADMIN
            }
        });
        if (superAdmin) {
            return;
        }
        const newSuperAdmin = userRepository.create({
            email: this.env.DEFAULT_SUPER_ADMIN_EMAIL,
            firstName: this.env.DEFAULT_SUPER_ADMIN_FIRST_NAME,
            lastName: this.env.DEFAULT_SUPER_ADMIN_LAST_NAME,
            password: await bcrypt.hash(this.env.DEFAULT_SUPER_ADMIN_PASSWORD, 10),
            role: Role.SUPER_ADMIN,
        });
        await userRepository.save(newSuperAdmin);
    }
}

const seeder = new Seeder(AppDataSource, env);

seeder.seed().catch(console.error);