import {
  AppError,
  AuthenticationError,
  AuthorizationError,
  ConflictError,
  NotFoundError,
  PaymentError,
  PlanLimitError,
  RateLimitError,
  ValidationError,
} from '../../utils/errors';

describe('AppError hierarchy', () => {
  it('AppError carries message, status, code, details', () => {
    const e = new AppError('msg', 418, 'TEAPOT', { x: 1 });
    expect(e.message).toBe('msg');
    expect(e.statusCode).toBe(418);
    expect(e.code).toBe('TEAPOT');
    expect(e.details).toEqual({ x: 1 });
    expect(e.isOperational).toBe(true);
  });

  it('AppError applies default status, code, and operational flag', () => {
    const e = new AppError('minimal');
    expect(e.statusCode).toBe(500);
    expect(e.code).toBe('INTERNAL_ERROR');
    expect(e.isOperational).toBe(true);
    expect(e.details).toBeUndefined();
  });

  it('AppError accepts isOperational false for programmer errors', () => {
    const e = new AppError('bug', 500, 'INTERNAL_ERROR', undefined, false);
    expect(e.isOperational).toBe(false);
  });

  it('specialized errors are instances of AppError and Error', () => {
    expect(new ValidationError('v')).toBeInstanceOf(AppError);
    expect(new ValidationError('v')).toBeInstanceOf(Error);
    expect(new NotFoundError()).toBeInstanceOf(AppError);
  });

  it('ValidationError is 400 VALIDATION_ERROR', () => {
    const e = new ValidationError('bad', [{ field: 'a' }]);
    expect(e.statusCode).toBe(400);
    expect(e.code).toBe('VALIDATION_ERROR');
    expect(e.details).toEqual([{ field: 'a' }]);
  });

  it('AuthenticationError defaults to 401', () => {
    expect(new AuthenticationError().code).toBe('AUTHENTICATION_ERROR');
    expect(new AuthenticationError('x').message).toBe('x');
  });

  it('AuthorizationError is 403', () => {
    expect(new AuthorizationError().statusCode).toBe(403);
  });

  it('NotFoundError formats message', () => {
    expect(new NotFoundError('User').message).toBe('User not found');
    expect(new NotFoundError().message).toContain('not found');
  });

  it('ConflictError is 409', () => {
    const e = new ConflictError('dup');
    expect(e.statusCode).toBe(409);
    expect(e.code).toBe('CONFLICT');
  });

  it('PaymentError is 402', () => {
    const e = new PaymentError('pay', { id: 1 });
    expect(e.statusCode).toBe(402);
    expect(e.details).toEqual({ id: 1 });
  });

  it('RateLimitError is 429', () => {
    expect(new RateLimitError().statusCode).toBe(429);
  });

  it('PlanLimitError is 402 PLAN_LIMIT_EXCEEDED', () => {
    const e = new PlanLimitError('limit');
    expect(e.code).toBe('PLAN_LIMIT_EXCEEDED');
  });
});
