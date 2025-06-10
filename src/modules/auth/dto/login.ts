import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsString, IsNotEmpty } from "class-validator";

export class LoginDto {
    @ApiProperty({
        example: "email@email.com",
        description: "User email address"
    })
    @IsEmail({}, { message: "Please provide a valid email address" })
    email: string;

    @ApiProperty({
        example: "password123",
        description: "User password"
    })
    @IsString({ message: "Password must be a string" })
    password: string;
}

export class LoginResponseDto {
    accessToken: string;
    user: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
        role: string;
        avatar?: string;
        status?: string;
    };
}