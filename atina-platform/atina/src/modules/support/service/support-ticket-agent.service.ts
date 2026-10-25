/**
 * AI support problem-solver — acts on support_ticket tasks (not PDF theater).
 * Uses RAG + chatCompletions to propose/apply a concrete resolution the client can use.
 */
import { getAiClient } from '../../../integrations';
import { AiRagService } from '../../ai-rag/service/ai-rag.service';
import { NotificationsService } from '../../notifications/service/notifications.service';
import { TasksRepository } from '../../tasks/repository/tasks.repository';
import logger from '../../../utils/logger';

export type SupportTicketSolveResult = {
  executed: boolean;
  type: 'support_ticket' | 'support_automation' | 'ai_support_ops';
  solved: boolean;
  confidence: 'high' | 'medium' | 'low' | 'none';
  resolutionSummary: string;
  actionSteps: string[];
  needsHuman: boolean;
  ragHits: number;
  aiConfigured: boolean;
};

function asRecord(v: unknown): Record<string, unknown> {
  if (v && typeof v === 'object' && !Array.isArray(v)) return v as Record<string, unknown>;
  if (typeof v === 'string') {
    try {
      const p = JSON.parse(v) as unknown;
      if (p && typeof p === 'object' && !Array.isArray(p)) return p as Record<string, unknown>;
    } catch {
      /* ignore */
    }
  }
  return {};
}

function extractJsonBlock(text: string): Record<string, unknown> | null {
  const fenced = text.match(/```json\s*([\s\S]*?)```/i);
  const raw = fenced?.[1]?.trim() ?? text.trim();
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(raw.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export class SupportTicketAgentService {
  private readonly tasks = new TasksRepository();
  private readonly rag = new AiRagService();
  private readonly notifications = new NotificationsService();
  private readonly ai = getAiClient();

  async solveFromJobPayload(
    type: string,
    payload: Record<string, unknown>,
  ): Promise<SupportTicketSolveResult> {
    const taskId = typeof payload.taskId === 'string' ? payload.taskId : null;
    if (!taskId) {
      return this.emptyResult(type, 'Missing taskId — cannot load support ticket');
    }

    const { rows } = await this.tasks.getTaskById(taskId);
    const task = rows[0];
    if (!task) {
      return this.emptyResult(type, `Task ${taskId} not found`);
    }

    const userId = task.user_id;
    const problem = [task.name, task.description].filter(Boolean).join('\n\n');
    const taskPayload = asRecord(task.payload);
    const deliverableId =
      typeof taskPayload.deliverableId === 'string' ? taskPayload.deliverableId : null;

    let ragHits = 0;
    let ragContext = '';
    try {
      const search = await this.rag.search(userId, {
        q: problem.slice(0, 500),
        limit: 6,
        enrich: false,
      });
      ragHits = Array.isArray(search.hits) ? search.hits.length : 0;
      ragContext = (search.hits ?? [])
        .map((h: { content?: string }) => String(h.content ?? '').trim())
        .filter(Boolean)
        .join('\n---\n')
        .slice(0, 10_000);
    } catch (err) {
      logger.warn('Support ticket RAG search failed', {
        taskId,
        error: err instanceof Error ? err.message : String(err),
      });
    }

    if (!this.ai.isConfigured()) {
      const fallbackSteps = [
        'Open Deliveries and download your package artifacts (PDF + commercial pack).',
        'Open Billing and confirm your invoice/receipt for this purchase.',
        'Reply on this ticket with the exact error, screenshot, or URL that is broken.',
      ];
      await this.persistResolution(taskId, userId, {
        solved: false,
        confidence: 'none',
        resolutionSummary:
          'AI solver is CONFIGURATION REQUIRED (no AI keys). Ticket stays open for human follow-up; checklist steps recorded.',
        actionSteps: fallbackSteps,
        needsHuman: true,
        ragHits,
      });
      return {
        executed: true,
        type: type as SupportTicketSolveResult['type'],
        solved: false,
        confidence: 'none',
        resolutionSummary:
          'AI not configured — honest handoff steps recorded; human must complete resolution.',
        actionSteps: fallbackSteps,
        needsHuman: true,
        ragHits,
        aiConfigured: false,
      };
    }

    let content = '';
    try {
      const reply = await this.ai.chatCompletions({
        messages: [
          {
            role: 'system',
            content: [
              'You are Omni Group Tech automated support. SOLVE the client problem — do not only summarize.',
              'Use knowledge excerpts when relevant. Be honest about CONFIGURATION REQUIRED items (Stripe LIVE, ads APIs, custom domain).',
              'Never invent live ads, live merchant Connect, or completed SSL/domain work.',
              'Respond ONLY with JSON:',
              '{"solved":boolean,"confidence":"high"|"medium"|"low","resolutionSummary":string,"actionSteps":string[],"needsHuman":boolean}',
              'Mark solved=true only when actionSteps are concrete and the client can finish without waiting on Omni for that issue.',
              'If the issue needs firma/legal/Stripe LIVE keys from the owner, set needsHuman=true and solved=false.',
            ].join(' '),
          },
          {
            role: 'user',
            content: [
              `Deliverable: ${deliverableId ?? 'unknown'}`,
              `Ticket: ${problem}`,
              ragContext ? `Knowledge excerpts:\n${ragContext}` : 'Knowledge excerpts: (none)',
            ].join('\n\n'),
          },
        ],
      });
      content = reply?.content ?? '';
    } catch (err) {
      logger.warn('Support ticket AI completion failed', {
        taskId,
        error: err instanceof Error ? err.message : String(err),
      });
      return this.emptyResult(type, 'AI completion failed — ticket left open for human');
    }

    const parsed = extractJsonBlock(content) ?? {};
    const actionSteps = Array.isArray(parsed.actionSteps)
      ? parsed.actionSteps.map((s) => String(s).trim()).filter(Boolean).slice(0, 8)
      : [];
    const confidenceRaw = String(parsed.confidence ?? 'low');
    const confidence =
      confidenceRaw === 'high' || confidenceRaw === 'medium' || confidenceRaw === 'low'
        ? confidenceRaw
        : 'low';
    const solved = parsed.solved === true && actionSteps.length > 0 && confidence !== 'low';
    const needsHuman = parsed.needsHuman === true || !solved;
    const resolutionSummary =
      typeof parsed.resolutionSummary === 'string' && parsed.resolutionSummary.trim()
        ? parsed.resolutionSummary.trim().slice(0, 2000)
        : content.slice(0, 1200) || 'No resolution text';

    await this.persistResolution(taskId, userId, {
      solved,
      confidence,
      resolutionSummary,
      actionSteps:
        actionSteps.length > 0
          ? actionSteps
          : ['Reply on this ticket with more detail so the solver can retry.'],
      needsHuman,
      ragHits,
    });

    return {
      executed: true,
      type: type as SupportTicketSolveResult['type'],
      solved,
      confidence,
      resolutionSummary,
      actionSteps,
      needsHuman,
      ragHits,
      aiConfigured: true,
    };
  }

  private emptyResult(type: string, message: string): SupportTicketSolveResult {
    return {
      executed: true,
      type: (type as SupportTicketSolveResult['type']) || 'support_ticket',
      solved: false,
      confidence: 'none',
      resolutionSummary: message,
      actionSteps: [],
      needsHuman: true,
      ragHits: 0,
      aiConfigured: this.ai.isConfigured(),
    };
  }

  private async persistResolution(
    taskId: string,
    userId: string,
    input: {
      solved: boolean;
      confidence: string;
      resolutionSummary: string;
      actionSteps: string[];
      needsHuman: boolean;
      ragHits: number;
    },
  ): Promise<void> {
    const { rows } = await this.tasks.getTaskById(taskId);
    const task = rows[0];
    if (!task) return;
    const prev = asRecord(task.payload);
    const nextPayload = {
      ...prev,
      aiSolver: {
        at: new Date().toISOString(),
        solved: input.solved,
        confidence: input.confidence,
        needsHuman: input.needsHuman,
        ragHits: input.ragHits,
        resolutionSummary: input.resolutionSummary,
        actionSteps: input.actionSteps,
      },
      status: input.solved ? 'resolved_by_ai' : 'needs_human',
    };
    try {
      await this.tasks.patchTaskPayload(taskId, nextPayload);
    } catch (err) {
      logger.warn('Support ticket payload patch failed', {
        taskId,
        error: err instanceof Error ? err.message : String(err),
      });
    }

    try {
      await this.notifications.createNotification({
        userId,
        type: 'support_ai_resolution',
        title: input.solved
          ? 'Support ticket — AI resolution ready'
          : 'Support ticket — AI triage (human may follow)',
        message: [
          input.resolutionSummary,
          '',
          ...input.actionSteps.map((s, i) => `${i + 1}. ${s}`),
        ]
          .join('\n')
          .slice(0, 3500),
        channel: 'in_app',
        actionUrl: '/dashboard/projects',
        metadata: {
          taskId,
          solved: input.solved,
          confidence: input.confidence,
          source: 'support-ticket-agent',
        },
      });
    } catch (err) {
      logger.warn('Support resolution notification failed', {
        taskId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
}
