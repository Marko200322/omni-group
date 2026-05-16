import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { BillingService } from './billing.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { PatchInvoiceDto } from './dto/patch-invoice.dto';

@Controller('invoices')
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  @Post()
  create(@Body() dto: CreateInvoiceDto) {
    return this.billing.create(dto);
  }

  @Get()
  findAll() {
    return this.billing.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.billing.findOne(id);
  }

  @Patch(':id')
  patch(@Param('id', ParseUUIDPipe) id: string, @Body() dto: PatchInvoiceDto) {
    return this.billing.patch(id, dto);
  }
}
