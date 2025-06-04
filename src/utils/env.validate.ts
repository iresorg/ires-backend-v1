import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsString,
  validateSync,
} from 'class-validator';

enum Environment {
  Development = 'development',
  Production = 'production',
}

export class EnvVariables {
  @IsEnum(Environment)
  NODE_ENV: Environment;

  @IsNumber()
  DB_PORT: number;

  @IsString()
  DB_HOST: string;

  @IsString()
  DB_USER: string;

  @IsString()
  DB_PASS: string;

  @IsString()
  DB_NAME: string;

  @IsString()
  DB_TYPE: string;

  @IsString()
  @IsNotEmpty()
  JWT_TOKEN_SECRET: string;

  @IsString()
  @IsNotEmpty()
  REFRESH_TOKEN_SECRET: string;

  @IsString()
  @IsNotEmpty()
  DEFAULT_SUPER_ADMIN_PASSWORD: string;

  @IsString()
  @IsNotEmpty()
  DEFAULT_SUPER_ADMIN_EMAIL: string;

  @IsString()
  @IsNotEmpty()
  DEFAULT_SUPER_ADMIN_FIRST_NAME: string;

  @IsString()
  @IsNotEmpty()
  DEFAULT_SUPER_ADMIN_LAST_NAME: string;
}

export function validateEnv(env: Record<string, unknown>) {
  const validatedEnv = plainToInstance(EnvVariables, env, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validatedEnv, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }

  return validatedEnv;
}
