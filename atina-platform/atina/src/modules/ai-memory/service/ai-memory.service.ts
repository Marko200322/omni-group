import { getAiClient } from '../../../integrations';
import logger from '../../../utils/logger';
import type { RecallQueryDtoType, RememberDtoType } from '../dto/ai-memory.dto';
import { AiMemoryRepository } from '../repository/ai-memory.repository';

function escapeLikeFragment(s: string): string {
  return s.replace(/!/g, '!!').replace(/%/g, '!%').replace(/_/g, '!_');
}

export class AiMemoryService {
  private readonly repo: AiMemoryRepository;
  private readonly ai = getAiClient();

  constructor(repo?: AiMemoryRepository) {
    this.repo = repo ?? new AiMemoryRepository();
  }

  async remember(userId: string, dto: RememberDtoType) {
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
    const { namespace, key } = queryParams;
    const likePattern =
      key !== undefined
        ? `memory:${escapeLikeFragment(namespace)}:${escapeLikeFragment(key)}%`
        : `memory:${escapeLikeFragment(namespace)}:%`;

    const local = await this.repo.recallByLike(userId, likePattern);

    if (this.ai.isConfigured()) {
      const remote = await this.ai.recall(namespace, key);
      if (remote) {
        return { local: local.rows, remote };
      }
    }

    return local.rows;
  }
}
