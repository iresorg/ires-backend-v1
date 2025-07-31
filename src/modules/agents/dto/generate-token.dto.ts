import { IsDate, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

export class GenerateTokenDto {
	@IsNotEmpty()
	@IsDate()
	@Type(() => Date)
	expiresAt: Date;
}
