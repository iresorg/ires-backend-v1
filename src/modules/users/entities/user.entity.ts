import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
} from 'typeorm';
import { Status } from '../enums/status.enum';
import { Role } from '../enums/role.enum';
import { BaseEntity } from '@/shared/entity/base.entity';

@Entity('users')
export class User extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column("varchar", { name: "first_name" })
  firstName: string;

  @Column("varchar", { name: "last_name" })
  lastName: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column({
    type: 'varchar',
  })
  role: Role;

  @Column({
    type: 'varchar',
    default: Status.ACTIVE,
  })
  status: Status;

  @Column({ nullable: true })
  last_login: Date;

  @Column({ nullable: true })
  avatar: string;
}
