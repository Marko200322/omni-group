import { ScalingService } from '../scaling/service/scaling.service';
import logger from '../../utils/logger';

export type DominusSwarmPayload = {
  profileCount?: number;
  zone?: string;
  workloadKey?: string;
  targetUtilizationPct?: number;
};

/**
 * Faza 6 MVP: batch swarm plan — registers synthetic nodes + scaling evaluate.
 * Not 125k live HTTP profiles.
 */
export async function runDominusSwarmBatch(payload: DominusSwarmPayload): Promise<Record<string, unknown>> {
  const scaling = new ScalingService();
  const count = Math.min(Math.max(payload.profileCount ?? 100, 1), 10_000);
  const zone = payload.zone ?? 'default';
  const nodesToRegister = Math.min(Math.ceil(count / 500), 20);

  const registered: string[] = [];
  for (let i = 0; i < nodesToRegister; i++) {
    const node = await scaling.registerNode(
      `dominus-swarm-${zone}-${Date.now()}-${i}`,
      zone,
      50 + (i % 50),
      { profileBatch: count, index: i, phase: 'f6-mvp' }
    );
    const row = node as { node_name: string };
    registered.push(row.node_name);
  }

  const evaluation = await scaling.evaluate({
    targetUtilizationPct: payload.targetUtilizationPct ?? 70,
    workloadKey: payload.workloadKey ?? 'dominus_swarm',
  });

  logger.info('Dominus swarm batch evaluated', {
    profileCount: count,
    nodesRegistered: registered.length,
    action: evaluation.action,
  });

  return {
    status: 'planned',
    profileCount: count,
    nodesRegistered: registered.length,
    nodeNames: registered,
    scaling: evaluation,
    note: 'MVP coordinator — not 125k live profile execution. See docs/FAZA-6-DOMINUS-SWARM.md',
  };
}
