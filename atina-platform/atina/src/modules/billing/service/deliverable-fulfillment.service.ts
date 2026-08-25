import fs from 'fs';
import { config } from '../../../config';
import { getDeliverable } from '../lib/deliverable-catalog';
import { resolveDeliverableFulfillmentHandler } from '../lib/deliverable-handlers/registry';
import type { FulfillmentContext, FulfillmentEnqueueInput, FulfillmentResult } from '../lib/deliverable-handlers/types';
import type { FulfillmentGenerationHints } from '../lib/fulfillment-generation-hints';
import {
  formatChecklistFailures,
  runFulfillmentQualityChecklist,
  type FulfillmentChecklistResult,
} from '../lib/fulfillment-quality-checklist';
import {
  DeliverableFulfillmentRepository,
  type FulfillmentJobRow,
} from '../repository/deliverable-fulfillment.repository';
import { PaymentNotificationsService } from '../../payments/service/payment-notifications.service';
import { adminOpsNotifier } from '../../admin/service/admin-ops-notifier.service';
import { TasksService } from '../../tasks/service/tasks.service';
import { FulfillmentMemoryService } from './fulfillment-memory.service';
import { resolvePlanDeliverableId } from '../lib/plan-deliverable-map';
import logger from '../../../utils/logger';

export type { FulfillmentEnqueueInput };

type FulfillmentRunOutcome = {
  result: FulfillmentResult;
  checklist: FulfillmentChecklistResult | null;
  attemptNumber: number;
};

export class DeliverableFulfillmentService {
  private readonly repo = new DeliverableFulfillmentRepository();
  private readonly notifications = new PaymentNotificationsService();
  private readonly tasks = new TasksService();
  private readonly fulfillmentMemory = new FulfillmentMemoryService();

  isEnabled(): boolean {
    return config.deliverableFulfillment.enabled;
  }

  /** Fire-and-forget after payment confirm — idempotent per payment_id. */
  dispatchAfterPaymentConfirm(input: FulfillmentEnqueueInput): void {
    if (!this.isEnabled()) {
      logger.info('Deliverable fulfillment disabled — skipping', { paymentId: input.paymentId });
      return;
    }

    void this.enqueueAndRun(input).catch((err: unknown) => {
      logger.error('Deliverable fulfillment dispatch failed', {
        paymentId: input.paymentId,
        error: err instanceof Error ? err.message : String(err),
      });
    });
  }

  private resolveDeliverableId(input: FulfillmentEnqueueInput): string | null {
    if (input.purchaseType === 'deliverable' && input.deliverableId) {
      return input.deliverableId.trim();
    }
    if (input.purchaseType === 'platform_plan' && input.planSlug) {
      return resolvePlanDeliverableId(input.planSlug);
    }
    return null;
  }

  private canReleaseToClient(checklist: FulfillmentChecklistResult | null): boolean {
    if (!config.deliverableFulfillment.blockReleaseUntilChecklistPasses) return true;
    if (!config.deliverableFulfillment.autoChecklistEnabled) return true;
    return checklist?.passed === true;
  }

  private scheduleQualityRetry(
    input: FulfillmentEnqueueInput,
    attemptNumber: number,
    retryNotes: string,
  ): void {
    void this.enqueueAndRun(input, { retryNotes, attemptNumber }).catch((err: unknown) => {
      logger.error('Automated quality retry failed', {
        paymentId: input.paymentId,
        attemptNumber,
        error: err instanceof Error ? err.message : String(err),
      });
    });
  }

  private buildGenerationHints(input: {
    attemptNumber: number;
    retryNotes?: string | null;
  }): FulfillmentGenerationHints {
    return {
      attemptNumber: input.attemptNumber,
      retryNotes: input.retryNotes?.trim() || undefined,
    };
  }

  private async attachMemoryHints(
    hints: FulfillmentGenerationHints,
    userId: string,
    deliverableId: string,
  ): Promise<FulfillmentGenerationHints> {
    const memoryHints = await this.fulfillmentMemory.recallHints(userId, deliverableId);
    if (!memoryHints.length) return hints;
    return { ...hints, memoryHints };
  }

  private resolveAttemptNumber(job: FulfillmentJobRow | null, override?: number): number {
    if (override != null && override >= 1) return override;
    return DeliverableFulfillmentRepository.readAttemptNumber(job?.result);
  }

  private async runFulfillmentWithChecklist(
    ctx: FulfillmentContext,
    handler: NonNullable<ReturnType<typeof resolveDeliverableFulfillmentHandler>>,
    attemptNumber: number,
    retryNotes?: string | null,
  ): Promise<FulfillmentRunOutcome> {
    const maxChecklistRetries = Math.max(0, config.deliverableFulfillment.maxChecklistRetries);
    let lastResult: FulfillmentResult | null = null;
    let lastChecklist: FulfillmentChecklistResult | null = null;
    let currentAttempt = attemptNumber;
    let notes = retryNotes ?? null;

    for (let checklistTry = 0; checklistTry <= maxChecklistRetries; checklistTry += 1) {
      const hints = await this.attachMemoryHints(
        this.buildGenerationHints({
          attemptNumber: currentAttempt,
          retryNotes: notes,
        }),
        ctx.userId,
        ctx.deliverableId,
      );

      const runCtx: FulfillmentContext = { ...ctx, generationHints: hints };
      lastResult = await handler.fulfill(runCtx);

      if (!config.deliverableFulfillment.autoChecklistEnabled) {
        return { result: lastResult, checklist: null, attemptNumber: currentAttempt };
      }

      lastChecklist = runFulfillmentQualityChecklist(ctx.deliverableId, lastResult);
      if (lastChecklist.passed) {
        return { result: lastResult, checklist: lastChecklist, attemptNumber: currentAttempt };
      }

      if (checklistTry >= maxChecklistRetries) {
        logger.warn('Fulfillment checklist failed after retries', {
          paymentId: ctx.paymentId,
          deliverableId: ctx.deliverableId,
          score: lastChecklist.score,
        });
        break;
      }

      notes = [notes, formatChecklistFailures(lastChecklist)].filter(Boolean).join('\n\n');
      currentAttempt += 1;
      logger.info('Fulfillment checklist retry', {
        paymentId: ctx.paymentId,
        deliverableId: ctx.deliverableId,
        attempt: currentAttempt,
      });
    }

    return {
      result: lastResult!,
      checklist: lastChecklist,
      attemptNumber: currentAttempt,
    };
  }

  async enqueueAndRun(
    input: FulfillmentEnqueueInput,
    opts?: { retryNotes?: string | null; attemptNumber?: number },
  ): Promise<Record<string, unknown> | null> {
    const deliverableId = this.resolveDeliverableId(input);
    if (!deliverableId) {
      logger.warn('No deliverable mapping for fulfillment', input);
      return null;
    }

    const existing = await this.repo.getByPaymentId(input.paymentId);
    if (existing?.status === 'completed' && existing.review_status !== 'rejected') {
      return existing.result;
    }

    let job = existing;
    if (!job) {
      job = await this.repo.createJob({
        paymentId: input.paymentId,
        userId: input.userId,
        purchaseType: input.purchaseType,
        deliverableId,
        planSlug: input.planSlug ?? null,
      });
    }
    if (!job) {
      job = await this.repo.getByPaymentId(input.paymentId);
    }
    if (!job) return null;
    if (job.status === 'completed' && job.review_status !== 'rejected') return job.result;
    if (job.status === 'running') return null;

    await this.repo.markRunning(job.id);

    try {
      const clientName = (input.clientName ?? 'Client').trim();
      const attemptNumber = this.resolveAttemptNumber(job, opts?.attemptNumber);
      const retryNotes = opts?.retryNotes ?? job.review_notes;

      const ctx: FulfillmentContext = {
        paymentId: input.paymentId,
        userId: input.userId,
        deliverableId,
        jobId: job.id,
        clientName: clientName.length >= 2 ? clientName : 'Client',
        clientEmail: input.clientEmail ?? null,
        industryCategory: input.industryCategory ?? null,
        planSlug: input.planSlug ?? null,
        purchaseType: input.purchaseType,
      };

      const handler = resolveDeliverableFulfillmentHandler(deliverableId);
      if (!handler) {
        throw new Error(`No fulfillment handler for deliverable: ${deliverableId}`);
      }

      const outcome = await this.runFulfillmentWithChecklist(ctx, handler, attemptNumber, retryNotes);

      if (!this.canReleaseToClient(outcome.checklist)) {
        const maxAttempts = Math.max(1, config.deliverableFulfillment.maxRetryAttempts);
        if (attemptNumber < maxAttempts && outcome.checklist) {
          await this.repo.resetForAutomatedRetry(job.id);
          logger.info('Automated quality gate failed — scheduling retry', {
            paymentId: input.paymentId,
            nextAttempt: attemptNumber + 1,
            score: outcome.checklist.score,
          });
          this.scheduleQualityRetry(
            input,
            attemptNumber + 1,
            formatChecklistFailures(outcome.checklist),
          );
          return null;
        }
        const failMsg = outcome.checklist
          ? `Automated quality gate failed: ${formatChecklistFailures(outcome.checklist)}`
          : 'Automated quality gate failed';
        await this.repo.markFailed(job.id, failMsg, {
          deliverableId,
          fulfillmentMeta: { attemptNumber, checklist: outcome.checklist },
        });
        void adminOpsNotifier.notify('fulfillment_failed', [
          `Payment: ${input.paymentId}`,
          `Deliverable: ${deliverableId}`,
          failMsg,
        ]);
        throw new Error(failMsg);
      }

      await this.createAuditTask(ctx, outcome.result);

      const requireQa = config.deliverableFulfillment.requireQaBeforeRelease;
      const reviewStatus = requireQa ? 'pending_review' : 'approved';

      const payload = {
        jobId: job.id,
        deliverableId,
        projectId: outcome.result.projectId ?? null,
        publicUrl: outcome.result.publicUrl ?? null,
        artifacts: outcome.result.artifacts.map((a) => ({
          type: a.type,
          filename: a.filename,
          downloadLabel: a.downloadLabel,
          storagePath: a.storagePath,
        })),
        status: outcome.result.status,
        automated: true,
        reviewStatus,
        metadata: outcome.result.metadata ?? {},
        fulfillmentMeta: {
          attemptNumber: outcome.attemptNumber,
          checklist: outcome.checklist,
          learningLoopEnabled: config.deliverableFulfillment.learningLoopEnabled,
        },
      };

      await this.repo.markCompleted(job.id, payload, reviewStatus);

      if (requireQa) {
        await this.notifyAdminQaPending(ctx, outcome.result, outcome.checklist);
      } else {
        await this.notifyClient(ctx, outcome.result);
        await this.fulfillmentMemory.rememberSuccess({
          userId: ctx.userId,
          deliverableId,
          industryCategory: ctx.industryCategory,
          paymentId: ctx.paymentId,
          result: outcome.result,
          checklist: outcome.checklist ?? undefined,
        });
      }

      return payload;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await this.repo.markFailed(job.id, message);
      void adminOpsNotifier.notify('fulfillment_failed', [
        `Payment: ${input.paymentId}`,
        `Deliverable: ${deliverableId}`,
        message,
      ]);
      throw err;
    }
  }

  private async createAuditTask(ctx: FulfillmentContext, result: FulfillmentResult): Promise<void> {
    const deliverable = getDeliverable(ctx.deliverableId);
    try {
      await this.tasks.createTask(ctx.userId, {
        type: 'deliverable_fulfillment',
        name: `Deliver ${deliverable?.name ?? ctx.deliverableId}`,
        description: `Automated fulfillment completed — ${result.artifacts.length} artifact(s), status ${result.status}.`,
        payload: {
          paymentId: ctx.paymentId,
          deliverableId: ctx.deliverableId,
          projectId: result.projectId,
          publicUrl: result.publicUrl,
          artifactCount: result.artifacts.length,
        },
      });
    } catch (err) {
      logger.warn('Fulfillment audit task skipped', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  private async notifyAdminQaPending(
    ctx: FulfillmentContext,
    result: FulfillmentResult,
    checklist: FulfillmentChecklistResult | null,
  ): Promise<void> {
    const deliverable = getDeliverable(ctx.deliverableId);
    const notifyEmail = config.paymentNotifyEmail.trim() || config.admin.email;
    if (!notifyEmail) return;
    try {
      await this.notifications.sendDeliverableQaPendingToAdmin({
        toEmail: notifyEmail,
        clientName: ctx.clientName,
        deliverableName: deliverable?.name ?? ctx.deliverableId,
        paymentId: ctx.paymentId,
        artifactCount: result.artifacts.length,
        publicUrl: result.publicUrl ?? undefined,
      });
      if (checklist && !checklist.passed) {
        logger.warn('Fulfillment sent to QA with checklist warnings', {
          paymentId: ctx.paymentId,
          score: checklist.score,
          failures: formatChecklistFailures(checklist),
        });
      }
    } catch (err) {
      logger.warn('QA pending admin notify skipped', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  async approveRelease(paymentId: string): Promise<Record<string, unknown> | null> {
    const job = await this.repo.getByPaymentId(paymentId);
    if (!job || job.status !== 'completed') return null;
    if (job.review_status === 'approved') return job.result;

    const updated = await this.repo.setReviewStatus(paymentId, 'approved');
    if (!updated) return null;

    const result = updated.result as Record<string, unknown>;
    const artifacts = Array.isArray(result.artifacts) ? result.artifacts : [];
    const user = await this.lookupUser(job.user_id);
    const meta = (result.fulfillmentMeta as Record<string, unknown> | undefined) ?? {};
    const checklist = meta.checklist as FulfillmentChecklistResult | undefined;

    const ctx: FulfillmentContext = {
      paymentId,
      userId: job.user_id,
      deliverableId: job.deliverable_id ?? 'unknown',
      jobId: job.id,
      clientName: user?.name ?? 'Client',
      clientEmail: user?.email ?? null,
      industryCategory: null,
      planSlug: job.plan_slug,
      purchaseType: job.purchase_type,
    };

    const fulfillmentResult: FulfillmentResult = {
      artifacts: artifacts
        .map((a) => {
          const art = a as Record<string, unknown>;
          return {
            type: String(art.type ?? 'file'),
            filename: String(art.filename ?? ''),
            storagePath: String(art.storagePath ?? ''),
            downloadLabel: typeof art.downloadLabel === 'string' ? art.downloadLabel : undefined,
          };
        })
        .filter((a) => a.filename && a.storagePath),
      status: 'completed',
      publicUrl: typeof result.publicUrl === 'string' ? result.publicUrl : null,
      metadata: (result.metadata as Record<string, unknown>) ?? {},
      projectId: typeof result.projectId === 'string' ? result.projectId : undefined,
    };

    if (user?.email) {
      await this.notifyClient(ctx, fulfillmentResult);
    }

    await this.fulfillmentMemory.rememberSuccess({
      userId: job.user_id,
      deliverableId: job.deliverable_id ?? 'unknown',
      industryCategory: null,
      paymentId,
      result: fulfillmentResult,
      checklist,
    });

    logger.info('Fulfillment QA approved', { paymentId, deliverable: job.deliverable_id });
    return updated.result;
  }

  async rejectRelease(paymentId: string, notes?: string): Promise<boolean> {
    const job = await this.repo.getByPaymentId(paymentId);
    if (!job || job.status !== 'completed') return false;

    const updated = await this.repo.setReviewStatus(paymentId, 'rejected', notes ?? null);
    if (!updated) return false;

    const attemptNumber = DeliverableFulfillmentRepository.readAttemptNumber(updated.result);
    const maxRetries = Math.max(0, config.deliverableFulfillment.maxRetryAttempts);

    if (!config.deliverableFulfillment.learningLoopEnabled || attemptNumber >= maxRetries) {
      logger.info('Fulfillment QA rejected — no auto retry', {
        paymentId,
        attemptNumber,
        maxRetries,
      });
      return true;
    }

    const reset = await this.repo.resetForRetry(paymentId, notes ?? null);
    if (!reset) return true;

    const user = await this.lookupUser(job.user_id);
    const nextAttempt = attemptNumber + 1;

    logger.info('Fulfillment QA rejected — scheduling retry', {
      paymentId,
      nextAttempt,
      maxRetries,
    });

    void this.enqueueAndRun(
      {
        paymentId,
        userId: job.user_id,
        purchaseType: job.purchase_type,
        deliverableId: job.deliverable_id,
        planSlug: job.plan_slug,
        clientName: user?.name ?? null,
        clientEmail: user?.email ?? null,
      },
      { retryNotes: notes ?? null, attemptNumber: nextAttempt },
    ).catch((err: unknown) => {
      logger.error('Fulfillment QA retry failed', {
        paymentId,
        error: err instanceof Error ? err.message : String(err),
      });
    });

    return true;
  }

  private async lookupUser(userId: string): Promise<{ email: string; name: string } | null> {
    try {
      const { query } = await import('../../../database/connection');
      const { rows } = await query<{ email: string; name: string }>(
        `SELECT email, name FROM users WHERE id = $1 LIMIT 1`,
        [userId],
      );
      return rows[0] ?? null;
    } catch {
      return null;
    }
  }

  private async notifyClient(ctx: FulfillmentContext, result: FulfillmentResult): Promise<void> {
    if (!ctx.clientEmail) return;

    const deliverable = getDeliverable(ctx.deliverableId);
    const pdfAttachments = result.artifacts
      .filter((a) => a.filename.endsWith('.pdf') && fs.existsSync(a.storagePath))
      .map((a) => ({
        filename: a.filename,
        content: fs.readFileSync(a.storagePath),
        contentType: 'application/pdf',
      }));

    await this.notifications.sendDeliverableReadyToClient({
      toEmail: ctx.clientEmail,
      toName: ctx.clientName,
      deliverableName: deliverable?.name ?? ctx.deliverableId,
      deliverableId: ctx.deliverableId,
      publicUrl: result.publicUrl ?? undefined,
      paymentId: ctx.paymentId,
      artifactLabels: result.artifacts.map((a) => a.downloadLabel ?? a.filename),
      attachments: pdfAttachments.length ? pdfAttachments : undefined,
    });
  }
}
