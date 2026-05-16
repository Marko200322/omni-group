import { NotFoundError } from '../../../utils/errors';
import {
  CreateProxyRotationDtoType,
  ProxyRotationStatusDto,
  ProxyRotationStatusDtoType,
  RunProxyRotationDtoType,
} from '../dto/proxy-rotation.dto';
import { getScraperClient } from '../../../integrations';
import { ProxyRotationRepository } from '../repository/proxy-rotation.repository';

export class ProxyRotationService {
  private readonly repo = new ProxyRotationRepository();
  private readonly scraper = getScraperClient();

  async list(userId: string) {
    const { rows } = await this.repo.listByUser(userId);
    return rows;
  }

  async create(userId: string, dto: CreateProxyRotationDtoType) {
    const { rows } = await this.repo.create(userId, dto.name, dto.budgetAllocated, dto.poolSize);
    return rows[0];
  }

  async run(systemId: string, userId: string, dto: RunProxyRotationDtoType) {
    const { rows: found } = await this.repo.getOwned(systemId, userId);
    if (!found[0]) throw new NotFoundError('Proxy Rotation workspace');

    const row = found[0] as Record<string, unknown>;
    const cfg = (typeof row.config === 'object' && row.config && !Array.isArray(row.config) ? row.config : {}) as Record<
      string,
      unknown
    >;
    const poolSize = Math.max(1, Number(cfg.pool_size ?? 10));
    const prevIndex = Number(cfg.rotation_index ?? 0);
    const nextIndex = (prevIndex + 1) % poolSize;
    let proxyId = `px_${String(nextIndex).padStart(3, '0')}`;
    if (this.scraper.isConfigured()) {
      const remoteProxy = await this.scraper.fetchProxy();
      const remoteId = remoteProxy?.proxyId ?? remoteProxy?.id;
      if (typeof remoteId === 'string' && remoteId.trim()) {
        proxyId = remoteId.trim();
      }
    }
    const latencyMs = 40 + Math.round(dto.intensity / 2);
    const estRevenue = Number(dto.revenueEstimate ?? 50);

    const { rows } = await this.repo.createRun(systemId, `proxy-rotation_${dto.mode}`, {
      nextProxyId: proxyId,
      rotationIndex: nextIndex,
      latencyMs,
      poolSize,
      mode: dto.mode,
      intensity: dto.intensity,
      estimatedRevenue: estRevenue,
    });
    await this.repo.updateAfterRun(systemId, estRevenue, dto.mode, dto.intensity, nextIndex, proxyId);
    return rows[0];
  }

  async status(): Promise<ProxyRotationStatusDtoType> {
    const status = {
      poolPolicy: 'round-robin' as const,
      activeProxies: 0,
      lastRotationAt: null,
    };
    return ProxyRotationStatusDto.parse(status);
  }
}
