import { IsNumberString, IsOptional, IsString, IsUUID } from 'class-validator';

export class PatchContractDto {
  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsNumberString()
  value?: string;
}
