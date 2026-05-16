import { WorkflowChainRepository } from '../../modules/workflow-chain/repository/workflow-chain.repository';
import * as db from '../../database/connection';

jest.mock('../../database/connection');

const mockQuery = db.query as jest.MockedFunction<typeof db.query>;

describe('WorkflowChainRepository', () => {
  let repo: WorkflowChainRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 } as never);
    repo = new WorkflowChainRepository();
  });

  it('create stringifies chain definition and binds user', async () => {
    const def = [{ a: 1 }];
    await repo.create('user-1', 'My chain', def);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO workflow_chains'),
      ['user-1', 'My chain', JSON.stringify(def)]
    );
  });

  it('list orders by created_at for user', async () => {
    await repo.list('u9');
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('ORDER BY created_at DESC'),
      ['u9']
    );
  });

  it('get scopes by user and id', async () => {
    await repo.get('u1', 'chain-id');
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('user_id = $1 AND id = $2'), [
      'u1',
      'chain-id',
    ]);
  });

  it('update passes nulls when name and steps omitted', async () => {
    await repo.update('u1', 'id1');
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('COALESCE($3, name)'),
      ['u1', 'id1', null, null]
    );
  });

  it('update JSON-stringifies steps when provided', async () => {
    const steps = [{ x: true }];
    await repo.update('u1', 'id1', 'Renamed', steps);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('COALESCE($4, chain_definition)'),
      ['u1', 'id1', 'Renamed', JSON.stringify(steps)]
    );
  });

  it('delete and setStatus bind user, id, and status', async () => {
    await repo.delete('u1', 'd1');
    expect(mockQuery).toHaveBeenLastCalledWith(expect.stringContaining('DELETE FROM workflow_chains'), [
      'u1',
      'd1',
    ]);
    await repo.setStatus('u1', 'd1', 'paused');
    expect(mockQuery).toHaveBeenLastCalledWith(expect.stringContaining("SET status = $3"), [
      'u1',
      'd1',
      'paused',
    ]);
  });

  it('touchRun updates by chain id only', async () => {
    await repo.touchRun('wf-only');
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('WHERE id = $1'), ['wf-only']);
  });

  it('listExecutions adds workflow filter when workflowId set', async () => {
    await repo.listExecutions('u1', 10, 0, '550e8400-e29b-41d4-a716-446655440000');
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("payload->>'workflowId' = $2"),
      ['u1', '550e8400-e29b-41d4-a716-446655440000', 10, 0]
    );
    await repo.listExecutions('u1', 5, 10);
    expect(mockQuery).toHaveBeenLastCalledWith(
      expect.not.stringContaining("payload->>'workflowId'"),
      ['u1', 5, 10]
    );
  });

  it('countExecutions branches on workflowId', async () => {
    await repo.countExecutions('u1', '550e8400-e29b-41d4-a716-446655440000');
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('COUNT(*)'), [
      'u1',
      '550e8400-e29b-41d4-a716-446655440000',
    ]);
    await repo.countExecutions('u2');
    expect(mockQuery).toHaveBeenLastCalledWith(expect.stringContaining('COUNT(*)'), ['u2']);
  });

  it('getExecution scopes task type and user', async () => {
    await repo.getExecution('u1', 'task-uuid');
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("type = 'workflow_chain_execution'"),
      ['task-uuid', 'u1']
    );
  });

  it('executionStats and stepAnalytics filter by workflow when provided', async () => {
    await repo.executionStats('u1', '550e8400-e29b-41d4-a716-446655440000');
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("payload->>'workflowId' = $2"),
      ['u1', '550e8400-e29b-41d4-a716-446655440000']
    );
    await repo.executionStats('u2');
    expect(mockQuery).toHaveBeenLastCalledWith(expect.stringContaining('FROM tasks'), ['u2']);

    await repo.stepAnalytics('u1', 14, '550e8400-e29b-41d4-a716-446655440000');
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("payload->>'workflowId' = $3"),
      ['u1', 14, '550e8400-e29b-41d4-a716-446655440000']
    );
    await repo.stepAnalytics('u3', 30);
    expect(mockQuery).toHaveBeenLastCalledWith(expect.stringContaining('jsonb_array_elements'), [
      'u3',
      30,
    ]);
  });
});
