import { IsNumberString, IsOptional, IsString } from 'class-validator';

export class PatchInvoiceDto {
  @IsOptional()
  @IsNumberString()
  amount?: string;

  @IsOptional()
  @IsString()
  status?: string;
}
