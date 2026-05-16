import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../database/entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>,
  ) {}

  async findById(id: string) {
    const u = await this.repo.findOne({ where: { id } });
    if (!u) throw new NotFoundException();
    return { id: u.id, email: u.email, createdAt: u.createdAt };
  }
}
