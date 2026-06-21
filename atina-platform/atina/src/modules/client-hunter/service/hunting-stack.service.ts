import { bootstrapHuntingWorkspaces } from '../../shared/ecosystem-workspace.util';
import { HuntingReadinessService } from '../../shared/hunting-readiness.service';
import { WorkflowChainService } from '../../workflow-chain/service/workflow-chain.service';
import { OutboundQueueService } from '../../autonomy-loop/service/outbound-queue.service';

export type RunNurtureLoopInput = {
  verticalSlug?: string;
  category?: string;
  verticalName?: string;
  intensity?: number;
  templateKey?: string;
  processOutbound?: boolean;
  force?: boolean;
};

export class HuntingStackService {
  private readonly readiness = new HuntingReadinessService();
  private readonly workflow = new WorkflowChainService();
  private readonly outbound = new OutboundQueueService();

  getReadiness(userId: string) {
    return this.readiness.getReadiness(userId);
  }

  async bootstrap(userId: string) {
    const workspaces = await bootstrapHuntingWorkspaces(userId);
    const readiness = await this.readiness.getReadiness(userId);
    return { workspaces, readiness };
  }

  async runPipeline(userId: string, input: RunNurtureLoopInput = {}) {
    await bootstrapHuntingWorkspaces(userId);

    const templateKey = input.templateKey ?? 'nurture-loop';
    const runInput: Record<string, unknown> = {
      verticalSlug: input.verticalSlug ?? 'marketing',
      intensity: input.intensity ?? 60,
    };
    if (input.category) runInput.category = input.category;
    if (input.verticalName) runInput.verticalName = input.verticalName;

    const execution = await this.workflow.createFromTemplateAndRun(
      userId,
      templateKey,
      undefined,
      runInput,
      Boolean(input.force)
    );

    let outboundSend: Record<string, unknown> | null = null;
    if (input.processOutbound !== false) {
      outboundSend = await this.outbound.processSendQueue();
    }

    const readiness = await this.readiness.getReadiness(userId);

    return {
      templateKey,
      execution,
      outboundSend,
      readiness,
    };
  }
}
