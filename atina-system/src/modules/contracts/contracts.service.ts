import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Contract } from '../../database/entities/contract.entity';
import { CreateContractDto } from './dto/create-contract.dto';
import { PatchContractDto } from './dto/patch-contract.dto';

@Injectable()
export class ContractsService {
  constructor(
    @InjectRepository(Contract)
    private readonly repo: Repository<Contract>,
  ) {}

  create(dto: CreateContractDto) {
    const row = this.repo.create({
      userId: dto.userId,
      status: dto.status ?? 'DRAFT',
      value: dto.value ?? '0',
    });
    return this.repo.save(row);
  }

  findAll() {
    return this.repo.find({ order: { createdAt: 'DESC' }, relations: ['user'] });
  }

  async findOne(id: string) {
    const row = await this.repo.findOne({
      where: { id },
      relations: ['user'],
    });
    if (!row) throw new NotFoundException('Ugovor nije pronađen');
    return row;
  }

  async patch(id: string, dto: PatchContractDto) {
    const row = await this.repo.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Ugovor nije pronađen');
    Object.assign(row, dto);
    return this.repo.save(row);
  }
}
