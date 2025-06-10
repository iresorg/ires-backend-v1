import { ApiProperty } from '@nestjs/swagger';
import { Role } from "../enums/role.enum"
import { Status } from "../enums/status.enum"

export class UserResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiProperty()
  email: string;

  @ApiProperty({ enum: Role })
  role: Role;

  @ApiProperty({ enum: Status })
  status: Status;

  @ApiProperty({ required: false })
  lastLogin?: Date;

  @ApiProperty({ required: false })
  avatar?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
