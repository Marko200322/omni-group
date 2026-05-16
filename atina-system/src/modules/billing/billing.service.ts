import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Invoice } from '../../database/entities/invoice.entity';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { PatchInvoiceDto } from './dto/patch-invoice.dto';

@Injectable()
export class BillingService {
  constructor(
    @InjectRepository(Invoice)
    private readonly repo: Repository<Invoice>,
  ) {}

  create(dto: CreateInvoiceDto) {
    const row = this.repo.create({
      contractId: dto.contractId,
      amount: dto.amount,
      status: dto.status ?? 'PENDING',
    });
    return this.repo.save(row);
  }

  findAll() {
    return this.repo.find({ order: { createdAt: 'DESC' }, relations: ['contract'] });
  }

  async findOne(id: string) {
    const row = await this.repo.findOne({
      where: { id },
      relations: ['contract'],
    });
    if (!row) throw new NotFoundException('Faktura nije pronađena');
    return row;
  }

  async patch(id: string, dto: PatchInvoiceDto) {
    const row = await this.repo.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Faktura nije pronađena');
    Object.assign(row, dto);
    return this.repo.save(row);
  }
}
