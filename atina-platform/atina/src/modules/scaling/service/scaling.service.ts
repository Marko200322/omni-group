import { ScalingRepository } from '../repository/scaling.repository';
import type { ScalingEvaluateDtoType } from '../dto/scaling.dto';

export type ScalingAction = 'none' | 'scale_up' | 'scale_down';

export class ScalingService {
  private readonly repo = new ScalingRepository();

  async listNodes() {
    const { rows } = await this.repo.listActive();
    return rows;
  }

  async registerNode(
    nodeName: string,
    zone: string,
    capacityScore: number,
    metadata: Record<string, unknown>
  ) {
    const { rows } = await this.repo.register(nodeName, zone, capacityScore, metadata);
    return rows[0];
  }

  async evaluate(dto: ScalingEvaluateDtoType) {
    const { rows } = await this.repo.avgUtilization();
    const avgUtil = parseFloat(rows[0]?.avg_util ?? '0');
    const nodeCount = parseInt(rows[0]?.node_count ?? '0', 10);
    const target = dto.targetUtilizationPct;

    let action: ScalingAction = 'none';
    let reason = 'Utilization within target band';

    if (nodeCount === 0) {
      action = 'scale_up';
      reason = 'No active nodes registered';
    } else if (avgUtil > target + 10) {
      action = 'scale_up';
      reason = `Average utilization ${avgUtil.toFixed(1)}% exceeds target ${target}%`;
    } else if (avgUtil < Math.max(20, target - 25) && nodeCount > 1) {
      action = 'scale_down';
      reason = `Average utilization ${avgUtil.toFixed(1)}% below scale-down threshold`;
    }

    return {
      action,
      reason,
      averageUtilizationPct: Number(avgUtil.toFixed(2)),
      activeNodes: nodeCount,
      targetUtilizationPct: target,
      workloadKey: dto.workloadKey ?? null,
      evaluatedAt: new Date().toISOString(),
    };
  }
}
