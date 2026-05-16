import { ForbiddenException } from '@nestjs/common';
import { assertInternalQueueSmokeKey } from './assert-internal-queue-smoke-key';

describe('assertInternalQueueSmokeKey', () => {
  const prev = process.env.INTERNAL_QUEUE_SMOKE_KEY;

  afterEach(() => {
    if (prev === undefined) {
      delete process.env.INTERNAL_QUEUE_SMOKE_KEY;
    } else {
      process.env.INTERNAL_QUEUE_SMOKE_KEY = prev;
    }
  });

  it('no-op when env unset', () => {
    delete process.env.INTERNAL_QUEUE_SMOKE_KEY;
    expect(() => assertInternalQueueSmokeKey(undefined)).not.toThrow();
    expect(() => assertInternalQueueSmokeKey('anything')).not.toThrow();
  });

  it('throws when env set and header missing', () => {
    process.env.INTERNAL_QUEUE_SMOKE_KEY = 'expected';
    expect(() => assertInternalQueueSmokeKey(undefined)).toThrow(ForbiddenException);
    expect(() => assertInternalQueueSmokeKey('')).toThrow(ForbiddenException);
    expect(() => assertInternalQueueSmokeKey('wrong')).toThrow(ForbiddenException);
  });

  it('passes when header matches env', () => {
    process.env.INTERNAL_QUEUE_SMOKE_KEY = 'expected';
    expect(() => assertInternalQueueSmokeKey('expected')).not.toThrow();
  });
});
