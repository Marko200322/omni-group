import { IsNumberString, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateInvoiceDto {
  @IsUUID()
  contractId: string;

  @IsNumberString()
  amount: string;

  @IsOptional()
  @IsString()
  status?: string;
}
