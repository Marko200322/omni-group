import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { User } from '../../database/entities/user.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const exists = await this.users.findOne({ where: { email: dto.email } });
    if (exists) throw new ConflictException('Email već registrovan');
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const u = this.users.create({ email: dto.email, passwordHash });
    await this.users.save(u);
    return this.issueToken(u);
  }

  async login(dto: LoginDto) {
    const u = await this.users.findOne({ where: { email: dto.email } });
    if (!u) throw new UnauthorizedException('Pogrešni kredencijali');
    const ok = await bcrypt.compare(dto.password, u.passwordHash);
    if (!ok) throw new UnauthorizedException('Pogrešni kredencijali');
    return this.issueToken(u);
  }

  private issueToken(u: User) {
    const payload = { sub: u.id, email: u.email };
    return {
      access_token: this.jwt.sign(payload),
      user: { id: u.id, email: u.email },
    };
  }
}
