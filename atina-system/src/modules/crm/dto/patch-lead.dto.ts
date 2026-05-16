import { IsEmail, IsOptional, IsString, IsUUID } from 'class-validator';

export class PatchLeadDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsUUID()
  userId?: string | null;
}
