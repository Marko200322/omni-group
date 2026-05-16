import { NotFoundError } from '../../../utils/errors';
import {
  AtinaSystemStatusDto,
  AtinaSystemStatusDtoType,
  CreateAtinaSystemDtoType,
  RunAtinaSystemDtoType,
} from '../dto/atina-system.dto';
import { readProdEnvReadinessSignals } from '../prod-env-readiness';
import { AtinaSystemRepository } from '../repository/atina-system.repository';

export class AtinaSystemService {
  private readonly repo = new AtinaSystemRepository();

  async list(userId: string) {
    const { rows } = await this.repo.listByUser(userId);
    return rows;
  }

  async create(userId: string, dto: CreateAtinaSystemDtoType) {
    const { rows } = await this.repo.create(
      userId,
      dto.name,
      dto.budgetAllocated,
      dto.operatingMode
    );
    return rows[0];
  }

  async run(systemId: string, userId: string, dto: RunAtinaSystemDtoType) {
    const { rows: found } = await this.repo.getOwned(systemId, userId);
    if (!found[0]) throw new NotFoundError('Atina System workspace');

    const throughput = dto.mode === 'execute' ? dto.intensity * 3 : dto.mode === 'optimize' ? dto.intensity * 2 : dto.intensity;
    const qualityScore = dto.mode === 'execute' ? 94 : dto.mode === 'optimize' ? 86 : 78;
    const revenue = dto.mode === 'execute' ? throughput * 4 : dto.mode === 'optimize' ? throughput * 2 : throughput;

    const { rows } = await this.repo.createRun(systemId, `atina-system_${dto.mode}`, {
      throughput,
      qualityScore,
      estimatedRevenue: revenue,
      mode: dto.mode,
      intensity: dto.intensity,
    });
    await this.repo.updateAfterRun(systemId, revenue, dto.mode, dto.intensity);
    return rows[0];
  }

  async status(): Promise<AtinaSystemStatusDtoType> {
    const status = {
      providers: ['core', 'cloud', 'partner'] as const,
      nextProvider: 'core' as const,
      capacity: {
        total: 1000,
        available: 1000,
      },
      recentEvents: [] as Array<{ id: string; eventType: string; createdAt: string }>,
      prodEnvReadiness: readProdEnvReadinessSignals(),
    };
    return AtinaSystemStatusDto.parse(status);
  }
}
