import logger from '../../../utils/logger';
import { AiRagService } from '../../ai-rag/service/ai-rag.service';
import { AutonomyLoopRepository } from '../repository/autonomy-loop.repository';

/** Ingest vertical research + config into ai-rag after generate (best-effort). */
export class AutonomyVerticalRagService {
  private readonly repo = new AutonomyLoopRepository();
  private readonly rag = new AiRagService();

  async ingestVertical(userId: string | null, verticalSlug: string): Promise<{ ingested: boolean; chunks?: number }> {
    if (!userId) return { ingested: false };

    try {
      const { rows } = await this.repo.getVerticalBySlug(verticalSlug);
      const vertical = rows[0];
      if (!vertical) return { ingested: false };

      const research = vertical.research_data ?? {};
      const configBlock = vertical.config ?? {};
      const text = [
        `Vertical: ${vertical.name} (${vertical.slug})`,
        `Category: ${vertical.category}`,
        `Status: ${vertical.status}`,
        typeof research === 'object' ? JSON.stringify(research, null, 2) : String(research),
        typeof configBlock === 'object' ? JSON.stringify(configBlock, null, 2) : String(configBlock),
      ].join('\n\n');

      const result = await this.rag.ingest(userId, {
        sourceId: `vertical:${verticalSlug}`,
        text: text.slice(0, 48_000),
        chunkSize: 2000,
        metadata: { verticalSlug, category: vertical.category, kind: 'autonomy_vertical' },
      });
      return { ingested: true, chunks: result.chunks };
    } catch (err) {
      logger.warn('Vertical RAG ingest skipped', {
        verticalSlug,
        error: err instanceof Error ? err.message : String(err),
      });
      return { ingested: false };
    }
  }
}
