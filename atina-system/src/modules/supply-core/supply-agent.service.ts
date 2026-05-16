import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PhaseService } from '../../phase-launch/phase.service';
import { SupplyAgentHeartbeat } from '../../database/entities/supply-agent-heartbeat.entity';
import { VaultResource } from '../../database/entities/vault-resource.entity';

/**
 * TSC — Supply Agent: periodična provera dostupnosti resursa i heartbeat u Vault.
 * (PDF sekcije 1–30: isti opis; ovde je izvršna logika.)
 */
@Injectable()
export class SupplyAgentService {
  private readonly logger = new Logger(SupplyAgentService.name);

  constructor(
    @InjectRepository(VaultResource)
    private readonly vault: Repository<VaultResource>,
    @InjectRepository(SupplyAgentHeartbeat)
    private readonly heartbeats: Repository<SupplyAgentHeartbeat>,
    private readonly phase: PhaseService,
  ) {}

  @Cron(CronExpression.EVERY_30_SECONDS)
  async tick(): Promise<void> {
    const count = await this.vault.count();
    const row = this.heartbeats.create({
      resourceCount: count,
      pendingWorkers: 0,
      phase: this.phase.getPhase(),
    });
    await this.heartbeats.save(row);
    this.logger.debug(`Supply Agent tick: vault_resources=${count}`);
  }

  async status() {
    const count = await this.vault.count();
    const last = await this.heartbeats.find({
      order: { createdAt: 'DESC' },
      take: 5,
    });
    return { vaultResourceCount: count, recentHeartbeats: last };
  }

  /** Ručni unos resursa (worker / integracija). */
  async addResource(
    provider: string,
    resourceType: string,
    label?: string | null,
    payload?: Record<string, unknown>,
  ) {
    const normalized =
      label != null && String(label).trim() !== '' ? String(label).trim() : null;
    const row = this.vault.create({
      provider,
      resourceType,
      label: normalized,
      payloadJson: payload ? JSON.stringify(payload) : null,
    });
    return this.vault.save(row);
  }
}
