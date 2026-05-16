import { NotFoundError } from '../../../utils/errors';
import {
  CreateTitanScoreDtoType,
  RunTitanScoreDtoType,
  TitanScoreStatusDto,
  TitanScoreStatusDtoType,
} from '../dto/titan-score.dto';
import { score0to100, stableStringify } from '../lib/deterministic-score';
import { TitanScoreRepository } from '../repository/titan-score.repository';

function meanInt(values: number[]): number {
  if (values.length === 0) return 0;
  const sum = values.reduce((a, b) => a + b, 0);
  return Math.round(sum / values.length);
}

type TitanWeightProfile = 'balanced' | 'ops' | 'growth';

function weightProfileFromRowConfig(config: unknown): TitanWeightProfile {
  let parsed: unknown = config;
  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed) as unknown;
    } catch {
      return 'balanced';
    }
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return 'balanced';
  const raw = (parsed as Record<string, unknown>).weight_profile;
  if (raw === 'balanced' || raw === 'ops' || raw === 'growth') return raw;
  return 'balanced';
}

export class TitanScoreService {
  private readonly repo = new TitanScoreRepository();

  async list(userId: string) {
    const { rows } = await this.repo.listByUser(userId);
    return rows;
  }

  async create(userId: string, dto: CreateTitanScoreDtoType) {
    const { rows } = await this.repo.create(userId, dto.name, dto.budgetAllocated, dto.weightProfile);
    return rows[0];
  }

  async run(systemId: string, userId: string, dto: RunTitanScoreDtoType) {
    const { rows: found } = await this.repo.getOwned(systemId, userId);
    if (!found[0]) throw new NotFoundError('Titan Score workspace');

    const weightProfile = weightProfileFromRowConfig(
      (found[0] as Record<string, unknown>).config
    );
    const output = this.buildRunOutput(systemId, dto, weightProfile);
    const primaryScore = output.primaryScore as number;
    const { rows } = await this.repo.createRun(systemId, `titan-score_${dto.mode}`, output);
    await this.repo.updateAfterRun(systemId, dto.mode, primaryScore);
    return rows[0];
  }

  async status(): Promise<TitanScoreStatusDtoType> {
    const status = {
      modes: ['snapshot', 'trend', 'compare'] as const,
      scoreRange: { min: 0 as const, max: 100 as const },
      weightProfiles: ['balanced', 'ops', 'growth'] as const,
    };
    return TitanScoreStatusDto.parse(status);
  }

  private buildRunOutput(
    systemId: string,
    dto: RunTitanScoreDtoType,
    weightProfile: TitanWeightProfile
  ): Record<string, unknown> {
    const base = `titan-score|${systemId}|${weightProfile}`;

    if (dto.mode === 'snapshot') {
      const seed = `${base}|snapshot|${stableStringify(dto.payload ?? {})}`;
      const score = score0to100(seed);
      return {
        mode: 'snapshot',
        weightProfile,
        score,
        primaryScore: score,
        scale: { min: 0, max: 100 },
      };
    }

    if (dto.mode === 'trend') {
      const series = dto.points.map((p, index) => {
        const seed = `${base}|trend|${index}|${stableStringify({ key: p.key, value: p.value })}`;
        const score = score0to100(seed);
        return { index, key: p.key, value: p.value, score };
      });
      const scores = series.map((s) => s.score);
      const min = Math.min(...scores);
      const max = Math.max(...scores);
      const mean = meanInt(scores);
      const first = scores[0];
      const last = scores[scores.length - 1];
      const delta = last - first;
      return {
        mode: 'trend',
        weightProfile,
        series,
        summary: { min, max, mean, delta },
        primaryScore: mean,
        scale: { min: 0, max: 100 },
      };
    }

    const leftSeed = `${base}|compare|left|${stableStringify(dto.left)}`;
    const rightSeed = `${base}|compare|right|${stableStringify(dto.right)}`;
    const leftScore = score0to100(leftSeed);
    const rightScore = score0to100(rightSeed);
    const delta = leftScore - rightScore;
    let winner: 'left' | 'right' | 'tie' = 'tie';
    if (leftScore > rightScore) winner = 'left';
    else if (rightScore > leftScore) winner = 'right';

    return {
      mode: 'compare',
      weightProfile,
      left: { score: leftScore, payload: dto.left },
      right: { score: rightScore, payload: dto.right },
      delta,
      winner,
      primaryScore: Math.max(leftScore, rightScore),
      scale: { min: 0, max: 100 },
    };
  }
}
