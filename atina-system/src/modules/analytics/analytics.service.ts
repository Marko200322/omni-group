import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Contract } from '../../database/entities/contract.entity';
import { Invoice } from '../../database/entities/invoice.entity';
import { Lead } from '../../database/entities/lead.entity';
import { User } from '../../database/entities/user.entity';
import { PhaseService } from '../../phase-launch/phase.service';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Lead) private readonly leads: Repository<Lead>,
    @InjectRepository(Contract) private readonly contracts: Repository<Contract>,
    @InjectRepository(Invoice) private readonly invoices: Repository<Invoice>,
    private readonly phase: PhaseService,
  ) {}

  async overview() {
    const [userCount, leadCount, contractCount, invoiceCount] = await Promise.all([
      this.users.count(),
      this.leads.count(),
      this.contracts.count(),
      this.invoices.count(),
    ]);
    return {
      users: userCount,
      leads: leadCount,
      contracts: contractCount,
      invoices: invoiceCount,
      phase: this.phase.getPhase(),
      billingEnabled: this.phase.isBillingEnabled(),
      aiEnabled: this.phase.isAiEnabled(),
      system: 'Atina System (Titan blueprint → Atina)',
    };
  }
}
