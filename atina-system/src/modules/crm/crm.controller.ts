import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { CrmService } from './crm.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { PatchLeadDto } from './dto/patch-lead.dto';

@Controller('leads')
export class CrmController {
  constructor(private readonly crm: CrmService) {}

  @Post()
  create(@Body() dto: CreateLeadDto) {
    return this.crm.create(dto);
  }

  @Get()
  findAll() {
    return this.crm.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.crm.findOne(id);
  }

  @Patch(':id')
  patch(@Param('id') id: string, @Body() dto: PatchLeadDto) {
    return this.crm.patch(id, dto);
  }
}
