import { getAiClient } from '../../../integrations';
import logger from '../../../utils/logger';
import { assertPlanIncludesModule } from '../../../utils/plan-module-access';
import type { RecallQueryDtoType, RememberDtoType } from '../dto/ai-memory.dto';
import { AiMemoryRepository } from '../repository/ai-memory.repository';

const AI_MEMORY_PLAN_MESSAGE = 'AI memory requires Partner (Enterprise) plan or higher';

function escapeLikeFragment(s: string): string {
  return s.replace(/!/g, '!!').replace(/%/g, '!%').replace(/_/g, '!_');
}

/** Remote aggregator recall must not block API responses (BFF timeout ~8s). */
const REMOTE_RECALL_TIMEOUT_MS = 2500;

export class AiMemoryService {
  private readonly repo: AiMemoryRepository;
  private readonly ai = getAiClient();

  constructor(repo?: AiMemoryRepository) {
    this.repo = repo ?? new AiMemoryRepository();
  }

  private recallRemoteBounded(namespace: string, key?: string): Promise<unknown | null> {
    return this.ai.recall(namespace, key, {
      timeoutMs: REMOTE_RECALL_TIMEOUT_MS,
      maxAttempts: 1,
    });
  }

  private async assertAccess(userId: string): Promise<void> {
    await assertPlanIncludesModule(userId, 'ai-memory', AI_MEMORY_PLAN_MESSAGE);
  }

  async remember(userId: string, dto: RememberDtoType) {
    await this.assertAccess(userId);
    const message = `memory:${dto.namespace}:${dto.key}`;
    const { rows } = await this.repo.insertRemember(userId, message, JSON.stringify(dto.value));

    if (this.ai.isConfigured()) {
      void this.ai
        .remember({
          namespace: dto.namespace,
          key: dto.key,
          value: dto.value,
          userId,
        })
        .catch((err) => logger.warn('AI aggregator remember failed', { error: String(err) }));
    }

    return rows[0];
  }

  async recall(userId: string, queryParams: RecallQueryDtoType) {
    await this.assertAccess(userId);
    const { namespace, key } = queryParams;
    const likePattern =
      key !== undefined
        ? `memory:${escapeLikeFragment(namespace)}:${escapeLikeFragment(key)}%`
        : `memory:${escapeLikeFragment(namespace)}:%`;

    const local = await this.repo.recallByLike(userId, likePattern);

    if (this.ai.isConfigured()) {
      const remote = await this.recallRemoteBounded(namespace, key);
      if (remote) {
        return { local: local.rows, remote };
      }
    }

    return local.rows;
  }
}
