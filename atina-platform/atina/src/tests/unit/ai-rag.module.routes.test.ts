import http from 'http';
import request from 'supertest';
import express from 'express';
import 'express-async-errors';
import * as db from '../../database/connection';
import { AiRagModule } from '../../modules/ai-rag/ai-rag.module';
import { sendError } from '../../utils/response';
import { AppError, AuthenticationError } from '../../utils/errors';

jest.mock('../../database/connection');

let aiRagAuthOn = true;
jest.mock('../../api/middleware/auth.middleware', () => ({
  authenticate: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    if (!aiRagAuthOn) {
      throw new AuthenticationError('No authentication token provided');
    }
    (req as express.Request & { user?: { userId: string; role: string; email: string } }).user = {
      userId: 'u1',
      role: 'user',
      email: 'u@test.com',
    };
    next();
  },
}));

const mockQuery = db.query as jest.MockedFunction<typeof db.query>;

describe('AiRagModule HTTP routes', () => {
  let server: http.Server;

  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    const m = new AiRagModule();
    await m.initialize();
    app.use('/ai-rag', m.router);
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
    aiRagAuthOn = true;
    jest.clearAllMocks();
    mockQuery.mockReset();
  });

  it('POST /ai-rag/ingest returns 401 when unauthenticated', async () => {
    aiRagAuthOn = false;
    const res = await request(server)
      .post('/ai-rag/ingest')
      .send({ sourceId: 'doc-1', text: 'hello' });
    expect(res.status).toBe(401);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('POST /ai-rag/ingest returns 400 for empty text', async () => {
    const res = await request(server).post('/ai-rag/ingest').send({ sourceId: 'doc-1', text: '' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('POST /ai-rag/ingest stores chunks', async () => {
    mockQuery.mockResolvedValue({ rows: [{ id: 'chunk-1' }], rowCount: 1 } as never);
    const res = await request(server)
      .post('/ai-rag/ingest')
      .send({ sourceId: 'doc-1', text: 'RAG content for tests' });
    expect(res.status).toBe(201);
    expect(res.body.chunks).toBe(1);
    expect(mockQuery).toHaveBeenCalled();
  });

  it('GET /ai-rag/search returns hits', async () => {
    mockQuery.mockResolvedValue({
      rows: [{ id: 'h1', content: 'match', source_id: 'doc-1' }],
      rowCount: 1,
    } as never);
    const res = await request(server).get('/ai-rag/search').query({ q: 'match' });
    expect(res.status).toBe(200);
    expect(res.body.hits).toHaveLength(1);
  });
});
