import { ScalingService } from '../scaling/service/scaling.service';
import { getCurrentPhase } from '../phase-launch/middleware/phase-activation.middleware';
import { edgeSwarmProfileCap, EDGE_SWARM_MAX_PROFILES_V6 } from '../../core/phase-boot-manifest';
import logger from '../../utils/logger';

export type DominusSwarmPayload = {
  profileCount?: number;
  zone?: string;
  workloadKey?: string;
  targetUtilizationPct?: number;
};

/**
 * Edge swarm batch — phase-gated profile cap (10k pre-v6, 125k at v6+).
 * Coordinator registers synthetic nodes + scaling evaluate; not live HTTP per profile.
 */
export async function runDominusSwarmBatch(payload: DominusSwarmPayload): Promise<Record<string, unknown>> {
  const scaling = new ScalingService();
  const phase = await getCurrentPhase();
  const cap = edgeSwarmProfileCap(phase);
  const requested = payload.profileCount ?? 100;
  const count = Math.min(Math.max(requested, 1), cap);
  const zone = payload.zone ?? 'default';
  const edgeMode = cap >= EDGE_SWARM_MAX_PROFILES_V6;
  const profilesPerNode = edgeMode ? 500 : 500;
  const maxNodes = edgeMode ? 250 : 20;
  const nodesToRegister = Math.min(Math.ceil(count / profilesPerNode), maxNodes);

  const registered: string[] = [];
  for (let i = 0; i < nodesToRegister; i++) {
    const node = await scaling.registerNode(
      `dominus-swarm-${zone}-${Date.now()}-${i}`,
      zone,
      50 + (i % 50),
      {
        profileBatch: count,
        index: i,
        phase: edgeMode ? 'v6-edge' : 'f6-mvp',
        shardProfiles: Math.ceil(count / nodesToRegister),
      }
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
    phase,
    edgeMode,
    cap,
    nodesRegistered: registered.length,
    action: evaluation.action,
  });

  return {
    status: edgeMode ? 'edge_planned' : 'planned',
    phase,
    edgeMode,
    profileCap: cap,
    profileCount: count,
    nodesRegistered: registered.length,
    nodeNames: registered.slice(0, 10),
    shardCount: nodesToRegister,
    scaling: evaluation,
    note: edgeMode
      ? 'v6 edge coordinator — batch plan for up to 125k profiles. See docs/FAZA-6-DOMINUS-SWARM.md'
      : 'MVP coordinator — raise phase to v6 via phase-launch for 125k cap',
  };
}
