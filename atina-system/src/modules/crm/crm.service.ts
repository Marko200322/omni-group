import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lead } from '../../database/entities/lead.entity';
import { CreateLeadDto } from './dto/create-lead.dto';
import { PatchLeadDto } from './dto/patch-lead.dto';

@Injectable()
export class CrmService {
  constructor(
    @InjectRepository(Lead)
    private readonly leads: Repository<Lead>,
  ) {}

  create(dto: CreateLeadDto) {
    const row = this.leads.create({
      name: dto.name,
      email: dto.email,
      status: dto.status ?? 'NEW',
      userId: dto.userId ?? null,
    });
    return this.leads.save(row);
  }

  findAll() {
    return this.leads.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: string) {
    const row = await this.leads.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Lead nije pronađen');
    return row;
  }

  async patch(id: string, dto: PatchLeadDto) {
    const row = await this.leads.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Lead nije pronađen');
    const updates = Object.fromEntries(
      Object.entries(dto).filter(([, v]) => v !== undefined),
    ) as Partial<PatchLeadDto>;
    Object.assign(row, updates);
    return this.leads.save(row);
  }
}
