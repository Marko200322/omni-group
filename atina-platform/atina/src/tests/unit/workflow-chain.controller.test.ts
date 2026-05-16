import { Request, Response } from 'express';
import { WorkflowChainController } from '../../modules/workflow-chain/controller/workflow-chain.controller';
import { WorkflowChainService } from '../../modules/workflow-chain/service/workflow-chain.service';

jest.mock('../../modules/workflow-chain/service/workflow-chain.service');

const WorkflowChainServiceMock = WorkflowChainService as jest.MockedClass<typeof WorkflowChainService>;

function mockService() {
  return {
    create: jest.fn().mockResolvedValue({ id: 'w1' }),
    list: jest.fn().mockResolvedValue([]),
    listTemplates: jest.fn().mockReturnValue([{ key: 'sales' }]),
    previewTemplate: jest.fn().mockResolvedValue({ key: 'sales', steps: [] }),
    createFromTemplate: jest.fn().mockResolvedValue({ id: 'from-tpl' }),
    createFromTemplateAndRun: jest.fn().mockResolvedValue({ id: 'run-tpl' }),
    bootstrapTemplates: jest.fn().mockResolvedValue({ inserted: 2 }),
    get: jest.fn().mockResolvedValue({ id: 'g1' }),
    validate: jest.fn().mockResolvedValue({ ok: true }),
    update: jest.fn().mockResolvedValue({ id: 'u1' }),
    clone: jest.fn().mockResolvedValue({ id: 'c1' }),
    pause: jest.fn().mockResolvedValue({ id: 'p1' }),
    activate: jest.fn().mockResolvedValue({ id: 'a1' }),
    delete: jest.fn().mockResolvedValue({ deleted: 1 }),
    listExecutions: jest.fn().mockResolvedValue({ rows: [], total: 0 }),
    executionStats: jest.fn().mockResolvedValue({ completed: 1 }),
    stepAnalytics: jest.fn().mockResolvedValue({ byStep: {} }),
    getExecution: jest.fn().mockResolvedValue({ id: 'ex1' }),
    rerunExecution: jest.fn().mockResolvedValue({ id: 'ex2' }),
    run: jest.fn().mockResolvedValue({ result: {} }),
  };
}

describe('WorkflowChainController', () => {
  let svc: ReturnType<typeof mockService>;
  let controller: WorkflowChainController;

  const res = (): Response => {
    const json = jest.fn().mockReturnThis();
    return {
      status: jest.fn().mockReturnThis(),
      json,
    } as unknown as Response;
  };

  const authed = (userId = 'u1'): Request =>
    ({ user: { userId, role: 'user', email: 'a@b.com' } }) as Request;

  beforeEach(() => {
    jest.clearAllMocks();
    svc = mockService();
    WorkflowChainServiceMock.mockImplementation(() => svc as unknown as WorkflowChainService);
    controller = new WorkflowChainController();
  });

  it('create delegates to service and returns 201', async () => {
    const r = res();
    await controller.create({
      ...authed(),
      body: { name: 'My chain', steps: [{ id: 's1', action: 'noop' }] },
    } as Request, r);
    expect(svc.create).toHaveBeenCalledWith('u1', 'My chain', [{ id: 's1', action: 'noop' }]);
    expect(r.status).toHaveBeenCalledWith(201);
  });

  it('list delegates to service', async () => {
    const r = res();
    await controller.list(authed(), r);
    expect(svc.list).toHaveBeenCalledWith('u1');
    expect(r.status).toHaveBeenCalledWith(200);
  });

  it('listTemplates calls synchronous listTemplates', async () => {
    const r = res();
    await controller.listTemplates(authed(), r);
    expect(svc.listTemplates).toHaveBeenCalled();
    expect(r.status).toHaveBeenCalledWith(200);
  });

  it('previewTemplate passes templateKey', async () => {
    const r = res();
    await controller.previewTemplate({ params: { templateKey: 'sales' } } as unknown as Request, r);
    expect(svc.previewTemplate).toHaveBeenCalledWith('sales');
  });

  it('createFromTemplate passes user and name', async () => {
    const r = res();
    await controller.createFromTemplate(
      { ...authed(), params: { templateKey: 'k' }, body: { name: 'N1' } } as unknown as Request,
      r
    );
    expect(svc.createFromTemplate).toHaveBeenCalledWith('u1', 'k', 'N1');
    expect(r.status).toHaveBeenCalledWith(201);
  });

  it('createAndRunFromTemplate passes force flag', async () => {
    const r = res();
    await controller.createAndRunFromTemplate(
      {
        ...authed(),
        params: { templateKey: 'k' },
        body: { name: 'Run1', input: { x: 1 }, force: true },
      } as unknown as Request,
      r
    );
    expect(svc.createFromTemplateAndRun).toHaveBeenCalledWith('u1', 'k', 'Run1', { x: 1 }, true);
  });

  it('bootstrapTemplates passes overwrite and namePrefix', async () => {
    const r = res();
    await controller.bootstrapTemplates(
      { ...authed(), body: { overwrite: true, namePrefix: 'pfx_' } } as unknown as Request,
      r
    );
    expect(svc.bootstrapTemplates).toHaveBeenCalledWith('u1', true, 'pfx_');
  });

  it('get passes chain id', async () => {
    const r = res();
    await controller.get({ ...authed(), params: { id: 'chain-9' } } as unknown as Request, r);
    expect(svc.get).toHaveBeenCalledWith('u1', 'chain-9');
  });

  it('validate passes chain id', async () => {
    const r = res();
    await controller.validate({ ...authed(), params: { id: 'c1' } } as unknown as Request, r);
    expect(svc.validate).toHaveBeenCalledWith('u1', 'c1');
  });

  it('update passes body', async () => {
    const r = res();
    await controller.update(
      { ...authed(), params: { id: 'c1' }, body: { name: 'new' } } as unknown as Request,
      r
    );
    expect(svc.update).toHaveBeenCalledWith('u1', 'c1', { name: 'new' });
  });

  it('clone passes new name', async () => {
    const r = res();
    await controller.clone(
      { ...authed(), params: { id: 'c1' }, body: { name: 'copy' } } as unknown as Request,
      r
    );
    expect(svc.clone).toHaveBeenCalledWith('u1', 'c1', 'copy');
    expect(r.status).toHaveBeenCalledWith(201);
  });

  it('pause and activate pass id', async () => {
    const r1 = res();
    await controller.pause({ ...authed(), params: { id: 'p' } } as unknown as Request, r1);
    expect(svc.pause).toHaveBeenCalledWith('u1', 'p');
    const r2 = res();
    await controller.activate({ ...authed(), params: { id: 'a' } } as unknown as Request, r2);
    expect(svc.activate).toHaveBeenCalledWith('u1', 'a');
  });

  it('delete passes id', async () => {
    const r = res();
    await controller.delete({ ...authed(), params: { id: 'd1' } } as unknown as Request, r);
    expect(svc.delete).toHaveBeenCalledWith('u1', 'd1');
  });

  it('listExecutions parses query', async () => {
    const wid = '550e8400-e29b-41d4-a716-446655440000';
    const r = res();
    await controller.listExecutions(
      { ...authed(), query: { page: 2, limit: 10, workflowId: wid } } as unknown as Request,
      r
    );
    expect(svc.listExecutions).toHaveBeenCalledWith('u1', 2, 10, wid);
  });

  it('executionStats passes workflowId', async () => {
    const wid = '550e8400-e29b-41d4-a716-446655440001';
    const r = res();
    await controller.executionStats({ ...authed(), query: { workflowId: wid } } as unknown as Request, r);
    expect(svc.executionStats).toHaveBeenCalledWith('u1', wid);
  });

  it('stepAnalytics parses days', async () => {
    const wid = '550e8400-e29b-41d4-a716-446655440002';
    const r = res();
    await controller.stepAnalytics(
      { ...authed(), query: { workflowId: wid, days: 7 } } as unknown as Request,
      r
    );
    expect(svc.stepAnalytics).toHaveBeenCalledWith('u1', 7, wid);
  });

  it('getExecution passes executionTaskId', async () => {
    const r = res();
    await controller.getExecution(
      { ...authed(), params: { executionTaskId: 'ex-1' } } as unknown as Request,
      r
    );
    expect(svc.getExecution).toHaveBeenCalledWith('u1', 'ex-1');
  });

  it('rerunExecution passes input body', async () => {
    const r = res();
    await controller.rerunExecution(
      { ...authed(), params: { executionTaskId: 'ex-1' }, body: { input: { a: 1 } } } as unknown as Request,
      r
    );
    expect(svc.rerunExecution).toHaveBeenCalledWith('u1', 'ex-1', { a: 1 });
  });

  it('run passes force boolean', async () => {
    const r = res();
    await controller.run(
      {
        ...authed(),
        params: { id: 'wf1' },
        body: { input: { q: 1 }, force: true },
      } as unknown as Request,
      r
    );
    expect(svc.run).toHaveBeenCalledWith('u1', 'wf1', { q: 1 }, true);
  });
});
