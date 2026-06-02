import { getAiClient } from '../../../integrations';
import logger from '../../../utils/logger';
import { AiRagRepository } from '../repository/ai-rag.repository';
import type { IngestRagDtoType, SearchRagQueryDtoType } from '../dto/ai-rag.dto';

function chunkText(text: string, size: number): string[] {
  const chunks: string[] = [];
  let i = 0;
  while (i < text.length) {
    chunks.push(text.slice(i, i + size));
    i += size;
  }
  return chunks.length ? chunks : [text];
}

export class AiRagService {
  private readonly repo = new AiRagRepository();
  private readonly ai = getAiClient();

  async ingest(userId: string, dto: IngestRagDtoType) {
    const parts = chunkText(dto.text, dto.chunkSize);
    const inserted = [];
    for (let i = 0; i < parts.length; i++) {
      const { rows } = await this.repo.insertChunk(
        userId,
        dto.sourceId,
        i,
        parts[i],
        { ...dto.metadata, totalChunks: parts.length }
      );
      inserted.push(rows[0]);
    }
    return { sourceId: dto.sourceId, chunks: inserted.length, ids: inserted.map((r) => r.id) };
  }

  async search(userId: string, params: SearchRagQueryDtoType) {
    const { rows } = await this.repo.searchChunks(
      userId,
      params.q,
      params.sourceId,
      params.limit
    );

    let summary: string | null = null;
    if (params.enrich && this.ai.isConfigured() && rows.length > 0) {
      const context = rows.map((r) => r.content).join('\n---\n').slice(0, 12_000);
      try {
        const reply = await this.ai.chatCompletions({
          messages: [
            {
              role: 'system',
              content: 'Summarize the following excerpts for the user query. Be concise.',
            },
            { role: 'user', content: `Query: ${params.q}\n\nExcerpts:\n${context}` },
          ],
        });
        summary = reply?.content ?? null;
      } catch (err) {
        logger.warn('AI RAG enrich failed', { error: String(err) });
      }
    }

    return { hits: rows, summary, query: params.q };
  }
}
