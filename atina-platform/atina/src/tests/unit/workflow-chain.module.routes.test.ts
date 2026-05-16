import http from 'http';
import request from 'supertest';
import express from 'express';
import 'express-async-errors';
import { WorkflowChainModule } from '../../modules/workflow-chain/workflow-chain.module';
import { WorkflowChainService } from '../../modules/workflow-chain/service/workflow-chain.service';
import { sendError } from '../../utils/response';
import { AppError, AuthenticationError } from '../../utils/errors';

jest.mock('../../modules/workflow-chain/service/workflow-chain.service');

jest.mock('../../api/middleware/rate-limit.middleware', () => ({
  authSessionLimiter: (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
}));

let wfAuthOn = true;
jest.mock('../../api/middleware/auth.middleware', () => ({
  authenticate: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    if (!wfAuthOn) {
      throw new AuthenticationError('No authentication token provided');
    }
    (req as express.Request & { user?: { userId: string; role: string; email: string } }).user = {
      userId: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
      role: 'user',
      email: 'wf@test.com',
    };
    next();
  },
}));

const WorkflowChainServiceMock = WorkflowChainService as jest.MockedClass<typeof WorkflowChainService>;

describe('WorkflowChainModule HTTP routes (validation + wiring)', () => {
  let server: http.Server;
  let listMock: jest.Mock;
  let createMock: jest.Mock;
  let listTemplatesMock: jest.Mock;
  let previewTemplateMock: jest.Mock;
  let executionStatsMock: jest.Mock;
  let stepAnalyticsMock: jest.Mock;
  let listExecutionsMock: jest.Mock;
  let getMock: jest.Mock;
  let getExecutionMock: jest.Mock;
  let validateMock: jest.Mock;
  let updateMock: jest.Mock;
  let cloneMock: jest.Mock;
  let pauseMock: jest.Mock;
  let activateMock: jest.Mock;
  let deleteMock: jest.Mock;
  let rerunExecutionMock: jest.Mock;
  let runMock: jest.Mock;
  let bootstrapTemplatesMock: jest.Mock;
  let createFromTemplateMock: jest.Mock;
  let createFromTemplateAndRunMock: jest.Mock;

  const WF_ID = '11111111-1111-4111-8111-111111111111';
  const TEMPLATE_KEY = 'sales-pipeline-chain';
  const EXEC_TASK_ID = '22222222-2222-4222-8222-222222222222';

  beforeAll(async () => {
    listMock = jest.fn().mockResolvedValue([{ id: 'w1', name: 'A' }]);
    createMock = jest.fn().mockResolvedValue({ id: 'new-wf', name: 'Created' });
    listTemplatesMock = jest.fn().mockReturnValue([{ key: 'sales-pipeline-chain', name: 'Sales' }]);
    previewTemplateMock = jest.fn().mockResolvedValue({ key: 'sales-pipeline-chain', steps: [] });
    executionStatsMock = jest.fn().mockResolvedValue({ completed: 1, failed: 0 });
    stepAnalyticsMock = jest.fn().mockResolvedValue({ byStep: {}, days: 30 });
    listExecutionsMock = jest.fn().mockResolvedValue({ rows: [], total: 0 });
    getMock = jest.fn().mockResolvedValue({ id: WF_ID, name: 'One' });
    getExecutionMock = jest.fn().mockResolvedValue({ id: EXEC_TASK_ID, status: 'done' });
    validateMock = jest.fn().mockResolvedValue({ valid: true, issues: [] });
    updateMock = jest.fn().mockResolvedValue({ id: WF_ID, name: 'Updated' });
    cloneMock = jest.fn().mockResolvedValue({ id: '33333333-3333-4333-8333-333333333333', name: 'Clone' });
    pauseMock = jest.fn().mockResolvedValue({ id: WF_ID, status: 'paused' });
    activateMock = jest.fn().mockResolvedValue({ id: WF_ID, status: 'active' });
    deleteMock = jest.fn().mockResolvedValue({ deleted: 1 });
    rerunExecutionMock = jest.fn().mockResolvedValue({ id: EXEC_TASK_ID, rerun: true });
    runMock = jest.fn().mockResolvedValue({ ok: true });
    bootstrapTemplatesMock = jest.fn().mockResolvedValue({ inserted: 3 });
    createFromTemplateMock = jest.fn().mockResolvedValue({ id: 'from-tpl', templateKey: TEMPLATE_KEY });
    createFromTemplateAndRunMock = jest.fn().mockResolvedValue({ id: 'run-tpl', ran: true });

    WorkflowChainServiceMock.mockImplementation(
      () =>
        ({
          list: listMock,
          create: createMock,
          listTemplates: listTemplatesMock,
          previewTemplate: previewTemplateMock,
          createFromTemplate: createFromTemplateMock,
          createFromTemplateAndRun: createFromTemplateAndRunMock,
          bootstrapTemplates: bootstrapTemplatesMock,
          get: getMock,
          validate: validateMock,
          update: updateMock,
          clone: cloneMock,
          pause: pauseMock,
          activate: activateMock,
          delete: deleteMock,
          listExecutions: listExecutionsMock,
          executionStats: executionStatsMock,
          stepAnalytics: stepAnalyticsMock,
          getExecution: getExecutionMock,
          rerunExecution: rerunExecutionMock,
          run: runMock,
        }) as unknown as WorkflowChainService
    );

    const app = express();
    app.use(express.json());
    const m = new WorkflowChainModule();
    await m.initialize();
    app.use('/workflow-chain', m.router);
    app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      if (err instanceof AppError) {
        return sendError(res, err.message, err.statusCode, err.code, err.details);
      }
      return sendError(res, err.message || 'Error', 500);
    });
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => resolve());
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  beforeEach(() => {
    wfAuthOn = true;
    jest.clearAllMocks();
    listMock.mockResolvedValue([{ id: 'w1', name: 'A' }]);
    createMock.mockResolvedValue({ id: 'new-wf', name: 'Created' });
    listTemplatesMock.mockReturnValue([{ key: 'sales-pipeline-chain', name: 'Sales' }]);
    previewTemplateMock.mockResolvedValue({ key: 'sales-pipeline-chain', steps: [] });
    executionStatsMock.mockResolvedValue({ completed: 1, failed: 0 });
    stepAnalyticsMock.mockResolvedValue({ byStep: {}, days: 30 });
    listExecutionsMock.mockResolvedValue({ rows: [], total: 0 });
    getMock.mockResolvedValue({ id: WF_ID, name: 'One' });
    getExecutionMock.mockResolvedValue({ id: EXEC_TASK_ID, status: 'done' });
    validateMock.mockResolvedValue({ valid: true, issues: [] });
    updateMock.mockResolvedValue({ id: WF_ID, name: 'Updated' });
    cloneMock.mockResolvedValue({ id: '33333333-3333-4333-8333-333333333333', name: 'Clone' });
    pauseMock.mockResolvedValue({ id: WF_ID, status: 'paused' });
    activateMock.mockResolvedValue({ id: WF_ID, status: 'active' });
    deleteMock.mockResolvedValue({ deleted: 1 });
    rerunExecutionMock.mockResolvedValue({ id: EXEC_TASK_ID, rerun: true });
    runMock.mockResolvedValue({ ok: true });
    bootstrapTemplatesMock.mockResolvedValue({ inserted: 3 });
    createFromTemplateMock.mockResolvedValue({ id: 'from-tpl', templateKey: TEMPLATE_KEY });
    createFromTemplateAndRunMock.mockResolvedValue({ id: 'run-tpl', ran: true });
  });

  it('GET /workflow-chain returns 400 when JSON body is not strict-empty', async () => {
    const res = await request(server)
      .get('/workflow-chain')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ noise: true }));
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('VALIDATION_ERROR');
    expect(listMock).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated GET /workflow-chain', async () => {
    wfAuthOn = false;
    const res = await request(server).get('/workflow-chain');
    expect(res.status).toBe(401);
    expect(res.body.error?.code).toBe('AUTHENTICATION_ERROR');
    expect(listMock).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated POST /workflow-chain', async () => {
    wfAuthOn = false;
    const res = await request(server).post('/workflow-chain').send({
      name: 'My flow',
      steps: [{ step: 'One', moduleSlug: 'crm', action: 'noop', config: {} }],
    });
    expect(res.status).toBe(401);
    expect(res.body.error?.code).toBe('AUTHENTICATION_ERROR');
    expect(createMock).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated GET /workflow-chain/templates', async () => {
    wfAuthOn = false;
    const res = await request(server).get('/workflow-chain/templates');
    expect(res.status).toBe(401);
    expect(res.body.error?.code).toBe('AUTHENTICATION_ERROR');
    expect(listTemplatesMock).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated GET /workflow-chain/:id', async () => {
    wfAuthOn = false;
    const res = await request(server).get(`/workflow-chain/${WF_ID}`);
    expect(res.status).toBe(401);
    expect(res.body.error?.code).toBe('AUTHENTICATION_ERROR');
    expect(getMock).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated POST /workflow-chain/:id/run', async () => {
    wfAuthOn = false;
    const res = await request(server).post(`/workflow-chain/${WF_ID}/run`).send({});
    expect(res.status).toBe(401);
    expect(res.body.error?.code).toBe('AUTHENTICATION_ERROR');
    expect(runMock).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated workflow-chain routes even with x-test-role admin header', async () => {
    wfAuthOn = false;
    const adminHdr = { 'x-test-role': 'admin' };

    let res = await request(server).get('/workflow-chain').set(adminHdr);
    expect(res.status).toBe(401);
    expect(res.body.error?.code).toBe('AUTHENTICATION_ERROR');
    expect(listMock).not.toHaveBeenCalled();

    res = await request(server)
      .post('/workflow-chain')
      .set(adminHdr)
      .send({
        name: 'My flow',
        steps: [{ step: 'One', moduleSlug: 'crm', action: 'noop', config: {} }],
      });
    expect(res.status).toBe(401);
    expect(res.body.error?.code).toBe('AUTHENTICATION_ERROR');
    expect(createMock).not.toHaveBeenCalled();

    res = await request(server).get('/workflow-chain/templates').set(adminHdr);
    expect(res.status).toBe(401);
    expect(res.body.error?.code).toBe('AUTHENTICATION_ERROR');
    expect(listTemplatesMock).not.toHaveBeenCalled();

    res = await request(server).get(`/workflow-chain/${WF_ID}`).set(adminHdr);
    expect(res.status).toBe(401);
    expect(res.body.error?.code).toBe('AUTHENTICATION_ERROR');
    expect(getMock).not.toHaveBeenCalled();

    res = await request(server).post(`/workflow-chain/${WF_ID}/run`).set(adminHdr).send({});
    expect(res.status).toBe(401);
    expect(res.body.error?.code).toBe('AUTHENTICATION_ERROR');
    expect(runMock).not.toHaveBeenCalled();
  });

  it('GET /workflow-chain lists chains', async () => {
    const res = await request(server).get('/workflow-chain');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([{ id: 'w1', name: 'A' }]);
    expect(listMock).toHaveBeenCalledWith('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee');
  });

  it('POST /workflow-chain returns 400 on invalid create body', async () => {
    const res = await request(server).post('/workflow-chain').send({ name: 'ab' });
    expect(res.status).toBe(400);
    expect(createMock).not.toHaveBeenCalled();
  });

  it('POST /workflow-chain creates chain', async () => {
    const body = {
      name: 'My flow',
      steps: [{ step: 'One', moduleSlug: 'crm', action: 'noop', config: {} }],
    };
    const res = await request(server).post('/workflow-chain').send(body);
    expect(res.status).toBe(201);
    expect(res.body.data.id).toBe('new-wf');
    expect(createMock).toHaveBeenCalledWith(
      'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
      'My flow',
      body.steps
    );
  });

  it('GET /workflow-chain/templates lists template catalog', async () => {
    const res = await request(server).get('/workflow-chain/templates');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([{ key: 'sales-pipeline-chain', name: 'Sales' }]);
    expect(listTemplatesMock).toHaveBeenCalled();
  });

  it('GET /workflow-chain/templates/:templateKey returns 400 for invalid template key', async () => {
    const res = await request(server).get('/workflow-chain/templates/bad@key');
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('VALIDATION_ERROR');
    expect(previewTemplateMock).not.toHaveBeenCalled();
  });

  it('GET /workflow-chain/templates/:templateKey previews template', async () => {
    const res = await request(server).get(`/workflow-chain/templates/${TEMPLATE_KEY}`);
    expect(res.status).toBe(200);
    expect(previewTemplateMock).toHaveBeenCalledWith(TEMPLATE_KEY);
  });

  it('GET /workflow-chain/executions/stats returns 400 when workflowId is not a uuid', async () => {
    const res = await request(server).get('/workflow-chain/executions/stats').query({ workflowId: 'not-a-uuid' });
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('VALIDATION_ERROR');
    expect(executionStatsMock).not.toHaveBeenCalled();
  });

  it('GET /workflow-chain/executions/stats returns 400 on unknown query key', async () => {
    const res = await request(server).get('/workflow-chain/executions/stats').query({ extra: '1' });
    expect(res.status).toBe(400);
    expect(executionStatsMock).not.toHaveBeenCalled();
  });

  it('GET /workflow-chain/executions/stats aggregates when query is valid', async () => {
    const wid = 'ffffffff-ffff-4fff-8fff-ffffffffffff';
    const res = await request(server).get('/workflow-chain/executions/stats').query({ workflowId: wid });
    expect(res.status).toBe(200);
    expect(executionStatsMock).toHaveBeenCalledWith('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', wid);
  });

  it('GET /workflow-chain/executions/stats omits workflowId when not provided', async () => {
    const res = await request(server).get('/workflow-chain/executions/stats');
    expect(res.status).toBe(200);
    expect(executionStatsMock).toHaveBeenCalledWith(
      'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
      undefined
    );
  });

  it('GET /workflow-chain/executions/step-analytics uses default days=30', async () => {
    const res = await request(server).get('/workflow-chain/executions/step-analytics');
    expect(res.status).toBe(200);
    expect(stepAnalyticsMock).toHaveBeenCalledWith(
      'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
      30,
      undefined
    );
  });

  it('GET /workflow-chain/executions/step-analytics passes days and workflowId', async () => {
    const wid = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    const res = await request(server)
      .get('/workflow-chain/executions/step-analytics')
      .query({ days: '14', workflowId: wid });
    expect(res.status).toBe(200);
    expect(stepAnalyticsMock).toHaveBeenCalledWith(
      'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
      14,
      wid
    );
  });

  it('GET /workflow-chain/executions/step-analytics returns 400 when days out of range', async () => {
    const res = await request(server).get('/workflow-chain/executions/step-analytics').query({ days: '0' });
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('VALIDATION_ERROR');
    expect(stepAnalyticsMock).not.toHaveBeenCalled();
  });

  it('GET /workflow-chain/executions/step-analytics returns 400 when days above 365', async () => {
    const res = await request(server).get('/workflow-chain/executions/step-analytics').query({ days: '366' });
    expect(res.status).toBe(400);
    expect(stepAnalyticsMock).not.toHaveBeenCalled();
  });

  it('GET /workflow-chain/executions/step-analytics returns 400 when workflowId invalid', async () => {
    const res = await request(server)
      .get('/workflow-chain/executions/step-analytics')
      .query({ workflowId: 'nope' });
    expect(res.status).toBe(400);
    expect(stepAnalyticsMock).not.toHaveBeenCalled();
  });

  it('GET /workflow-chain/executions/step-analytics returns 400 on unknown query key', async () => {
    const res = await request(server).get('/workflow-chain/executions/step-analytics').query({ foo: '1' });
    expect(res.status).toBe(400);
    expect(stepAnalyticsMock).not.toHaveBeenCalled();
  });

  it('GET /workflow-chain/executions uses default pagination', async () => {
    const res = await request(server).get('/workflow-chain/executions');
    expect(res.status).toBe(200);
    expect(listExecutionsMock).toHaveBeenCalledWith(
      'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
      1,
      20,
      undefined
    );
  });

  it('GET /workflow-chain/executions passes page limit workflowId', async () => {
    const res = await request(server)
      .get('/workflow-chain/executions')
      .query({ page: '3', limit: '50', workflowId: WF_ID });
    expect(res.status).toBe(200);
    expect(listExecutionsMock).toHaveBeenCalledWith(
      'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
      3,
      50,
      WF_ID
    );
  });

  it('GET /workflow-chain/executions returns 400 when page below 1', async () => {
    const res = await request(server).get('/workflow-chain/executions').query({ page: '0' });
    expect(res.status).toBe(400);
    expect(listExecutionsMock).not.toHaveBeenCalled();
  });

  it('GET /workflow-chain/executions returns 400 when limit above 100', async () => {
    const res = await request(server).get('/workflow-chain/executions').query({ limit: '101' });
    expect(res.status).toBe(400);
    expect(listExecutionsMock).not.toHaveBeenCalled();
  });

  it('GET /workflow-chain/executions returns 400 when workflowId invalid', async () => {
    const res = await request(server).get('/workflow-chain/executions').query({ workflowId: 'x' });
    expect(res.status).toBe(400);
    expect(listExecutionsMock).not.toHaveBeenCalled();
  });

  it('GET /workflow-chain/executions returns 400 on unknown query key', async () => {
    const res = await request(server).get('/workflow-chain/executions').query({ offset: '0' });
    expect(res.status).toBe(400);
    expect(listExecutionsMock).not.toHaveBeenCalled();
  });

  it('GET /workflow-chain/:id loads workflow when id is uuid', async () => {
    const res = await request(server).get(`/workflow-chain/${WF_ID}`);
    expect(res.status).toBe(200);
    expect(getMock).toHaveBeenCalledWith('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', WF_ID);
  });

  it('GET /workflow-chain/:id returns 400 when id is not uuid', async () => {
    const res = await request(server).get('/workflow-chain/not-uuid');
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('VALIDATION_ERROR');
    expect(getMock).not.toHaveBeenCalled();
  });

  it('GET /workflow-chain/executions/:executionTaskId returns execution', async () => {
    const res = await request(server).get(`/workflow-chain/executions/${EXEC_TASK_ID}`);
    expect(res.status).toBe(200);
    expect(getExecutionMock).toHaveBeenCalledWith(
      'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
      EXEC_TASK_ID
    );
  });

  it('GET /workflow-chain/executions/:executionTaskId returns 400 for invalid uuid', async () => {
    const res = await request(server).get('/workflow-chain/executions/bad-id');
    expect(res.status).toBe(400);
    expect(getExecutionMock).not.toHaveBeenCalled();
  });

  it('GET /workflow-chain/:id/validate runs validation', async () => {
    const res = await request(server).get(`/workflow-chain/${WF_ID}/validate`);
    expect(res.status).toBe(200);
    expect(validateMock).toHaveBeenCalledWith('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', WF_ID);
  });

  it('PATCH /workflow-chain/:id updates with body', async () => {
    const body = { name: 'Renamed flow' };
    const res = await request(server).patch(`/workflow-chain/${WF_ID}`).send(body);
    expect(res.status).toBe(200);
    expect(updateMock).toHaveBeenCalledWith('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', WF_ID, body);
  });

  it('PATCH /workflow-chain/:id returns 400 when name too short', async () => {
    const res = await request(server).patch(`/workflow-chain/${WF_ID}`).send({ name: 'ab' });
    expect(res.status).toBe(400);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('PATCH /workflow-chain/:id returns 400 on unknown body key', async () => {
    const res = await request(server).patch(`/workflow-chain/${WF_ID}`).send({ name: 'Ok name', extra: 1 });
    expect(res.status).toBe(400);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('POST /workflow-chain/:id/pause calls service', async () => {
    const res = await request(server).post(`/workflow-chain/${WF_ID}/pause`).send({});
    expect(res.status).toBe(200);
    expect(pauseMock).toHaveBeenCalledWith('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', WF_ID);
  });

  it('POST /workflow-chain/:id/pause returns 400 when body not empty', async () => {
    const res = await request(server).post(`/workflow-chain/${WF_ID}/pause`).send({ x: 1 });
    expect(res.status).toBe(400);
    expect(pauseMock).not.toHaveBeenCalled();
  });

  it('POST /workflow-chain/:id/activate calls service', async () => {
    const res = await request(server).post(`/workflow-chain/${WF_ID}/activate`).send({});
    expect(res.status).toBe(200);
    expect(activateMock).toHaveBeenCalledWith('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', WF_ID);
  });

  it('POST /workflow-chain/:id/clone with optional name', async () => {
    const res = await request(server)
      .post(`/workflow-chain/${WF_ID}/clone`)
      .send({ name: 'Cloned workflow' });
    expect(res.status).toBe(201);
    expect(cloneMock).toHaveBeenCalledWith(
      'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
      WF_ID,
      'Cloned workflow'
    );
  });

  it('POST /workflow-chain/:id/clone returns 400 when name too short', async () => {
    const res = await request(server).post(`/workflow-chain/${WF_ID}/clone`).send({ name: 'no' });
    expect(res.status).toBe(400);
    expect(cloneMock).not.toHaveBeenCalled();
  });

  it('DELETE /workflow-chain/:id removes workflow', async () => {
    const res = await request(server).delete(`/workflow-chain/${WF_ID}`).send({});
    expect(res.status).toBe(200);
    expect(deleteMock).toHaveBeenCalledWith('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', WF_ID);
  });

  it('POST /workflow-chain/:id/run with defaults', async () => {
    const res = await request(server).post(`/workflow-chain/${WF_ID}/run`).send({});
    expect(res.status).toBe(200);
    expect(runMock).toHaveBeenCalledWith(
      'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
      WF_ID,
      {},
      false
    );
  });

  it('POST /workflow-chain/:id/run passes input and force', async () => {
    const res = await request(server)
      .post(`/workflow-chain/${WF_ID}/run`)
      .send({ input: { leadId: '1' }, force: true });
    expect(res.status).toBe(200);
    expect(runMock).toHaveBeenCalledWith(
      'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
      WF_ID,
      { leadId: '1' },
      true
    );
  });

  it('POST /workflow-chain/:id/run returns 400 on unknown body key', async () => {
    const res = await request(server).post(`/workflow-chain/${WF_ID}/run`).send({ input: {}, unknown: true });
    expect(res.status).toBe(400);
    expect(runMock).not.toHaveBeenCalled();
  });

  it('POST /workflow-chain/executions/:executionTaskId/rerun with optional input', async () => {
    const res = await request(server)
      .post(`/workflow-chain/executions/${EXEC_TASK_ID}/rerun`)
      .send({ input: { retry: true } });
    expect(res.status).toBe(200);
    expect(rerunExecutionMock).toHaveBeenCalledWith(
      'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
      EXEC_TASK_ID,
      { retry: true }
    );
  });

  it('POST /workflow-chain/executions/:executionTaskId/rerun allows empty body', async () => {
    const res = await request(server)
      .post(`/workflow-chain/executions/${EXEC_TASK_ID}/rerun`)
      .send({});
    expect(res.status).toBe(200);
    expect(rerunExecutionMock).toHaveBeenCalledWith(
      'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
      EXEC_TASK_ID,
      undefined
    );
  });

  it('POST /workflow-chain/executions/:executionTaskId/rerun returns 400 on unknown body key', async () => {
    const res = await request(server)
      .post(`/workflow-chain/executions/${EXEC_TASK_ID}/rerun`)
      .send({ input: {}, extra: 1 });
    expect(res.status).toBe(400);
    expect(rerunExecutionMock).not.toHaveBeenCalled();
  });

  it('POST /workflow-chain/executions/:executionTaskId/rerun returns 400 for invalid execution uuid', async () => {
    const res = await request(server).post('/workflow-chain/executions/not-uuid/rerun').send({});
    expect(res.status).toBe(400);
    expect(rerunExecutionMock).not.toHaveBeenCalled();
  });

  it('POST /workflow-chain/templates/bootstrap uses defaults', async () => {
    const res = await request(server).post('/workflow-chain/templates/bootstrap').send({});
    expect(res.status).toBe(201);
    expect(bootstrapTemplatesMock).toHaveBeenCalledWith(
      'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
      false,
      undefined
    );
  });

  it('POST /workflow-chain/templates/bootstrap passes overwrite and namePrefix', async () => {
    const res = await request(server)
      .post('/workflow-chain/templates/bootstrap')
      .send({ overwrite: true, namePrefix: 'acme-' });
    expect(res.status).toBe(201);
    expect(bootstrapTemplatesMock).toHaveBeenCalledWith(
      'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
      true,
      'acme-'
    );
  });

  it('POST /workflow-chain/templates/bootstrap returns 400 on unknown body key', async () => {
    const res = await request(server)
      .post('/workflow-chain/templates/bootstrap')
      .send({ overwrite: false, other: 1 });
    expect(res.status).toBe(400);
    expect(bootstrapTemplatesMock).not.toHaveBeenCalled();
  });

  it('POST /workflow-chain/templates/:key/create calls service', async () => {
    const res = await request(server)
      .post(`/workflow-chain/templates/${TEMPLATE_KEY}/create`)
      .send({ name: 'From template name' });
    expect(res.status).toBe(201);
    expect(createFromTemplateMock).toHaveBeenCalledWith(
      'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
      TEMPLATE_KEY,
      'From template name'
    );
  });

  it('POST /workflow-chain/templates/:key/create allows empty body', async () => {
    const res = await request(server).post(`/workflow-chain/templates/${TEMPLATE_KEY}/create`).send({});
    expect(res.status).toBe(201);
    expect(createFromTemplateMock).toHaveBeenCalledWith(
      'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
      TEMPLATE_KEY,
      undefined
    );
  });

  it('POST /workflow-chain/templates/:key/create returns 400 when name too short', async () => {
    const res = await request(server)
      .post(`/workflow-chain/templates/${TEMPLATE_KEY}/create`)
      .send({ name: 'ab' });
    expect(res.status).toBe(400);
    expect(createFromTemplateMock).not.toHaveBeenCalled();
  });

  it('POST /workflow-chain/templates/:key/create returns 400 for invalid template key', async () => {
    const res = await request(server).post('/workflow-chain/templates/bad@key/create').send({});
    expect(res.status).toBe(400);
    expect(createFromTemplateMock).not.toHaveBeenCalled();
  });

  it('POST /workflow-chain/templates/:key/create-and-run uses defaults', async () => {
    const res = await request(server)
      .post(`/workflow-chain/templates/${TEMPLATE_KEY}/create-and-run`)
      .send({});
    expect(res.status).toBe(201);
    expect(createFromTemplateAndRunMock).toHaveBeenCalledWith(
      'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
      TEMPLATE_KEY,
      undefined,
      {},
      false
    );
  });

  it('POST /workflow-chain/templates/:key/create-and-run passes name input force', async () => {
    const res = await request(server)
      .post(`/workflow-chain/templates/${TEMPLATE_KEY}/create-and-run`)
      .send({ name: 'Run now', input: { k: 1 }, force: true });
    expect(res.status).toBe(201);
    expect(createFromTemplateAndRunMock).toHaveBeenCalledWith(
      'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
      TEMPLATE_KEY,
      'Run now',
      { k: 1 },
      true
    );
  });

  it('POST /workflow-chain/templates/:key/create-and-run returns 400 on unknown body key', async () => {
    const res = await request(server)
      .post(`/workflow-chain/templates/${TEMPLATE_KEY}/create-and-run`)
      .send({ name: 'Ok nm', extra: true });
    expect(res.status).toBe(400);
    expect(createFromTemplateAndRunMock).not.toHaveBeenCalled();
  });

  it('POST /workflow-chain/templates/:key/create-and-run returns 400 for invalid template key', async () => {
    const res = await request(server)
      .post('/workflow-chain/templates/bad@tpl/create-and-run')
      .send({});
    expect(res.status).toBe(400);
    expect(createFromTemplateAndRunMock).not.toHaveBeenCalled();
  });
});
