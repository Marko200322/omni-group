import { getAiClient } from '../../../integrations';
import { NotFoundError, ValidationError } from '../../../utils/errors';
import type { CreateDominusDtoType, RunDominusDtoType } from '../dto/dominus360.dto';
import { Dominus360Repository } from '../repository/dominus360.repository';

function nonNegativeForecastCount(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
}

export class Dominus360Service {
  private readonly repo = new Dominus360Repository();
  private readonly ai = getAiClient();

  async list(userId: string) {
    const { rows } = await this.repo.listByUser(userId);
    return rows;
  }

  async create(userId: string, dto: CreateDominusDtoType) {
    const { rows } = await this.repo.create(userId, dto.name, dto.stage, dto.budgetAllocated);
    const row = rows[0];
    if (row?.id) {
      await this.repo.auditCreated(userId, String(row.id), { name: dto.name, stage: dto.stage });
    }
    return row;
  }

  async run(systemId: string, userId: string, dto: RunDominusDtoType) {
    const { rows: systems } = await this.repo.getOwned(systemId, userId);
    if (!systems[0]) throw new NotFoundError('Dominus360 workspace');

    const system = systems[0] as { stage?: string; metrics?: { forecasts?: unknown } };
    const forecastsPrior = nonNegativeForecastCount(system.metrics?.forecasts);
    const forecastsNext = forecastsPrior + 1;

    if (dto.mode !== 'risk-scan' && system.stage === 'v1') {
      throw new ValidationError(`Mode '${dto.mode}' requires minimum readiness stage 'v2'`);
    }

    const delta = dto.mode === 'resource-allocation' ? 130 : dto.mode === 'risk-scan' ? 60 : 95;
    let riskScore = dto.mode === 'risk-scan' ? 35 : 45;
    const forecastGrowth = dto.mode === 'forecast' ? 14.2 : 8.8;

    if (this.ai.isConfigured() && dto.mode === 'risk-scan') {
      const rec = await this.ai.fetchRecommendations({
        mode: dto.mode,
        workspaceId: systemId,
        input: dto.input,
      });
      if (rec?.recommendations?.length) {
        riskScore = Math.min(100, riskScore + rec.recommendations.length * 2);
      }
    }

    const output = {
      mode: dto.mode,
      result: {
        risk_score: riskScore,
        forecast_growth_pct: forecastGrowth,
        ai_enriched: this.ai.isConfigured(),
      },
    };
    const inputPayload = { mode: dto.mode, input: dto.input };
    const runType = `dominus_${dto.mode}`;

    const { rows: runRows } = await this.repo.createRun(systemId, runType, inputPayload, output);
    await this.repo.updateAfterRun(systemId, delta, forecastsNext);
    if (runRows[0]?.id) {
      await this.repo.auditRunCompleted(userId, String(runRows[0].id), { mode: dto.mode, systemId });
    }
    return runRows[0];
  }
}
