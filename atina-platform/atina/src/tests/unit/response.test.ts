import type { Response } from 'express';
import { config } from '../../config';
import { paginate, sendCreated, sendError, sendSuccess } from '../../utils/response';

function mockRes(): Response {
  const json = jest.fn().mockReturnThis();
  const status = jest.fn().mockReturnValue({ json });
  return { status, json } as unknown as Response;
}

describe('response helpers', () => {
  const savedIsProd = config.app.isProd;

  afterEach(() => {
    config.app.isProd = savedIsProd;
  });

  it('sendSuccess builds body and optional meta', () => {
    const res = mockRes();
    sendSuccess(res, { a: 1 }, 'OK', 200, { page: 1, limit: 10, total: 3, totalPages: 1 });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { a: 1 },
      message: 'OK',
      meta: { page: 1, limit: 10, total: 3, totalPages: 1 },
    });
  });

  it('sendSuccess omits meta when not provided', () => {
    const res = mockRes();
    sendSuccess(res, { x: 1 });
    const payload = (res.json as jest.Mock).mock.calls[0][0];
    expect(payload).toEqual({
      success: true,
      data: { x: 1 },
      message: 'Success',
    });
    expect(payload.meta).toBeUndefined();
  });

  it('sendCreated uses 201', () => {
    const res = mockRes();
    sendCreated(res, { id: '1' }, 'Created');
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('sendCreated uses default message', () => {
    const res = mockRes();
    sendCreated(res, { id: '2' });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Created', success: true, data: { id: '2' } })
    );
  });

  it('sendError builds error envelope', () => {
    const res = mockRes();
    sendError(res, 'oops', 503, 'UNAVAILABLE', { retry: true });
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: { code: 'UNAVAILABLE', message: 'oops', details: { retry: true } },
    });
  });

  it('sendError uses default status and code', () => {
    const res = mockRes();
    sendError(res, 'fail');
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: { code: 'ERROR', message: 'fail', details: undefined },
    });
  });

  it('paginate delegates to sendSuccess with meta', () => {
    const res = mockRes();
    paginate(res, [{ id: 1 }], 25, 2, 10);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: [{ id: 1 }],
        meta: { page: 2, limit: 10, total: 25, totalPages: 3 },
      })
    );
  });

  it('sendError omits details for 5xx when app is production', () => {
    config.app.isProd = true;
    const res = mockRes();
    sendError(res, 'internal', 500, 'ERR', { secret: 'x' });
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: { code: 'ERR', message: 'internal', details: undefined },
    });
  });

  it('sendError keeps details for 4xx when app is production', () => {
    config.app.isProd = true;
    const res = mockRes();
    sendError(res, 'bad', 400, 'BAD', { field: 'a' });
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: { code: 'BAD', message: 'bad', details: { field: 'a' } },
    });
  });

  it('sendError keeps 5xx details when not production', () => {
    config.app.isProd = false;
    const res = mockRes();
    sendError(res, 'internal', 500, 'ERR', { hint: 'db' });
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: { code: 'ERR', message: 'internal', details: { hint: 'db' } },
    });
  });

  it('paginate uses raw limit in totalPages (caller should normalize limit)', () => {
    const res = mockRes();
    paginate(res, [], 10, 1, 0);
    const payload = (res.json as jest.Mock).mock.calls[0][0];
    expect(payload.meta.totalPages).toBe(Infinity);
  });
});
