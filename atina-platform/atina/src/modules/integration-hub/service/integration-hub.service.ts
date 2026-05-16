import { ConflictError, NotFoundError, ValidationError } from '../../../utils/errors';
import {
  findRecentEcosystemRunByIdempotencyKey,
  normalizeEcosystemIdempotencyKey,
  withEcosystemIdempotencyLock,
} from '../../../utils/ecosystem-idempotency';
import { getBusinessDevClient } from '../../../integrations';
import { IntegrationHubRepository } from '../repository/integration-hub.repository';

export class IntegrationHubService {
  private static readonly IDEMPOTENCY_PAYLOAD_MISMATCH_MESSAGE =
    'Idempotency key already used with different integration sync parameters';

  private readonly repo = new IntegrationHubRepository();
  private readonly businessDev = getBusinessDevClient();

  private ensureObject(value: unknown, fieldName: string): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new ValidationError(`${fieldName} must be an object`);
    }
    return value as Record<string, unknown>;
  }

  private computeDeterministicSyncedRecords(integrationId: string): number {
    let hash = 0;
    for (let i = 0; i < integrationId.length; i += 1) {
      hash = (hash * 31 + integrationId.charCodeAt(i)) % 100000;
    }
    return (hash % 120) + 1;
  }

  async create(
    userId: string,
    providerSlug: string,
    displayName: string,
    credentials: Record<string, unknown>,
    config: Record<string, unknown>
  ) {
    const normalizedProviderSlug = String(providerSlug ?? '').trim();
    const normalizedDisplayName = String(displayName ?? '').trim();
    if (normalizedProviderSlug.length < 2) {
      throw new ValidationError('providerSlug must contain at least 2 characters');
    }
    if (normalizedDisplayName.length < 2) {
      throw new ValidationError('displayName must contain at least 2 characters');
    }
    const safeCredentials = this.ensureObject(credentials ?? {}, 'credentials');
    const safeConfig = this.ensureObject(config ?? {}, 'config');
    const { rows } = await this.repo.create(
      userId,
      normalizedProviderSlug,
      normalizedDisplayName,
      safeCredentials,
      safeConfig
    );
    return rows[0];
  }

  async list(userId: string) {
    const { rows } = await this.repo.listByUser(userId);
    return rows;
  }

  async sync(userId: string, integrationId: string, rawIdempotencyKey?: string) {
    const normalizedIntegrationId = String(integrationId ?? '').trim();
    if (!normalizedIntegrationId) {
      throw new ValidationError('integrationId is required');
    }

    const idempotencyKey = normalizeEcosystemIdempotencyKey(rawIdempotencyKey);

    const buildResult = (row: Record<string, unknown>) => {
      const syncedRecords = this.computeDeterministicSyncedRecords(normalizedIntegrationId);
      const syncedAt = new Date().toISOString();
      return {
        ...row,
        syncedRecords,
        syncedAt,
        status: 'ok' as const,
        operation: 'sync' as const,
      };
    };

    const executeFreshSync = async () => {
      const { rows } = await this.repo.touchSync(normalizedIntegrationId, userId);
      if (!rows[0]) throw new NotFoundError('Integration');
      await this.repo.ensureShadowEcosystemForIntegration(
        normalizedIntegrationId,
        userId,
        String(rows[0].display_name ?? ''),
        String(rows[0].provider_slug ?? '')
      );
      const result = buildResult(rows[0]);
      if (this.businessDev.isConfigured()) {
        const remote = await this.businessDev.syncIntegration({
          integrationId: normalizedIntegrationId,
          providerSlug: String(rows[0].provider_slug ?? ''),
          userId,
        });
        if (remote && typeof remote.syncedRecords === 'number') {
          result.syncedRecords = remote.syncedRecords;
        }
      }
      if (idempotencyKey) {
        await this.repo.createRun(normalizedIntegrationId, 'integration_hub_sync', {
          idempotency_key: idempotencyKey,
          integration_id: normalizedIntegrationId,
          operation: 'sync',
          response: result,
        });
      }
      return result;
    };

    if (!idempotencyKey) {
      return executeFreshSync();
    }

    return withEcosystemIdempotencyLock(normalizedIntegrationId, idempotencyKey, async () => {
      const { rows: existingRuns } = await findRecentEcosystemRunByIdempotencyKey(
        normalizedIntegrationId,
        idempotencyKey
      );
      if (existingRuns[0]) {
        this.assertSyncIdempotencyPayloadMatches(existingRuns[0], normalizedIntegrationId);
        return this.readStoredSyncResponse(existingRuns[0]);
      }
      return executeFreshSync();
    });
  }

  private assertSyncIdempotencyPayloadMatches(row: Record<string, unknown>, integrationId: string) {
    const payload = row.output_payload as
      | { integration_id?: unknown; operation?: unknown }
      | undefined;
    const sameIntegration = payload?.integration_id === integrationId;
    const sameOperation = payload?.operation === 'sync';
    if (!sameIntegration || !sameOperation) {
      throw new ConflictError(IntegrationHubService.IDEMPOTENCY_PAYLOAD_MISMATCH_MESSAGE);
    }
  }

  private readStoredSyncResponse(row: Record<string, unknown>): Record<string, unknown> {
    const payload = row.output_payload as { response?: Record<string, unknown> } | undefined;
    const response = payload?.response;
    if (!response || typeof response !== 'object') {
      throw new ConflictError(IntegrationHubService.IDEMPOTENCY_PAYLOAD_MISMATCH_MESSAGE);
    }
    return response;
  }
}
