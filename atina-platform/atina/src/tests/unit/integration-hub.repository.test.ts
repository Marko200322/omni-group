import { IntegrationHubRepository } from '../../modules/integration-hub/repository/integration-hub.repository';
import * as db from '../../database/connection';

jest.mock('../../database/connection');

const mockQuery = db.query as jest.MockedFunction<typeof db.query>;

describe('IntegrationHubRepository', () => {
  let repo: IntegrationHubRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 } as never);
    repo = new IntegrationHubRepository();
  });

  it('create stringifies credentials and config for the insert', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'ic-1' }], rowCount: 1 } as never);
    const credentials = { token: 'secret' };
    const config = { channels: ['a'] };
    await repo.create('user-1', 'slack', 'Workspace', credentials, config);

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO integration_connections'),
      ['user-1', 'slack', 'Workspace', JSON.stringify(credentials), JSON.stringify(config)]
    );
  });

  it('listByUser scopes to user and orders newest first', async () => {
    await repo.listByUser('user-99');
    const [sql, params] = mockQuery.mock.calls[0];
    expect(sql).toContain('FROM integration_connections');
    expect(sql).toContain('WHERE user_id = $1');
    expect(sql).toContain('ORDER BY created_at DESC');
    expect(params).toEqual(['user-99']);
  });

  it('touchSync updates rows scoped by integration id and user', async () => {
    await repo.touchSync('int-1', 'user-1');
    const [sql, params] = mockQuery.mock.calls[0];
    expect(sql).toContain('UPDATE integration_connections');
    expect(sql).toContain('WHERE id = $1 AND user_id = $2');
    expect(params).toEqual(['int-1', 'user-1']);
  });

  it('ensureShadowEcosystemForIntegration upserts shadow system keyed by integration id', async () => {
    await repo.ensureShadowEcosystemForIntegration('ic-1', 'user-1', 'My integration', 'slack');
    const [sql, params] = mockQuery.mock.calls[0];
    expect(sql).toContain('INSERT INTO ecosystem_systems');
    expect(sql).toContain("VALUES ($1, $2, 'integration-hub', $3");
    expect(sql).toContain('ON CONFLICT (id) DO NOTHING');
    expect(params).toEqual(['ic-1', 'user-1', 'My integration', 'slack']);
  });

  it('createRun passes serialized output payload', async () => {
    const output = { idempotency_key: 'k1', ok: true };
    await repo.createRun('ecosystem-sys-1', 'integration_hub_sync', output);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO ecosystem_runs'),
      ['ecosystem-sys-1', 'integration_hub_sync', JSON.stringify(output)]
    );
  });
});
