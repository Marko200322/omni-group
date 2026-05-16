import { IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class AddVaultResourceDto {
  @IsString()
  @MaxLength(64)
  provider: string;

  @IsString()
  @MaxLength(128)
  resourceType: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  label?: string | null;

  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;
}
