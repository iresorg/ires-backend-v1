import { ApiProperty } from '@nestjs/swagger';
import { Role } from "../enums/role.enum"
import { Status } from "../enums/status.enum"

export class UserResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  first_name: string;

  @ApiProperty()
  last_name: string;

  @ApiProperty()
  email: string;

  @ApiProperty({ enum: Role })
  role: Role;

  @ApiProperty({ enum: Status })
  status: Status;

  @ApiProperty({ required: false })
  last_login?: Date;

  @ApiProperty({ required: false })
  avatar?: string;

  @ApiProperty()
  created_at: Date;

  @ApiProperty()
  updated_at: Date;
}
