import { HttpException, HttpStatus } from '@nestjs/common';
import type { Request } from 'express';
import {
  assertInternalQueueSmokeRateLimit,
  clientKeyFromQueueSmokeRequest,
  resetInternalQueueSmokeRateLimitForTests,
} from './assert-internal-queue-smoke-rate-limit';

describe('assertInternalQueueSmokeRateLimit', () => {
  const prevMax = process.env.INTERNAL_QUEUE_SMOKE_RATE_MAX_PER_WINDOW;
  const prevWindow = process.env.INTERNAL_QUEUE_SMOKE_RATE_WINDOW_MS;

  beforeEach(() => {
    resetInternalQueueSmokeRateLimitForTests();
  });

  afterEach(() => {
    resetInternalQueueSmokeRateLimitForTests();
    if (prevMax === undefined) {
      delete process.env.INTERNAL_QUEUE_SMOKE_RATE_MAX_PER_WINDOW;
    } else {
      process.env.INTERNAL_QUEUE_SMOKE_RATE_MAX_PER_WINDOW = prevMax;
    }
    if (prevWindow === undefined) {
      delete process.env.INTERNAL_QUEUE_SMOKE_RATE_WINDOW_MS;
    } else {
      process.env.INTERNAL_QUEUE_SMOKE_RATE_WINDOW_MS = prevWindow;
    }
  });

  it('no-ops when max per window is 0', () => {
    process.env.INTERNAL_QUEUE_SMOKE_RATE_MAX_PER_WINDOW = '0';
    const key = 'k-disabled';
    for (let i = 0; i < 5; i += 1) {
      assertInternalQueueSmokeRateLimit(key);
    }
  });

  it('allows up to max then 429', () => {
    process.env.INTERNAL_QUEUE_SMOKE_RATE_MAX_PER_WINDOW = '3';
    process.env.INTERNAL_QUEUE_SMOKE_RATE_WINDOW_MS = '60000';
    const key = 'k-limit';
    assertInternalQueueSmokeRateLimit(key);
    assertInternalQueueSmokeRateLimit(key);
    assertInternalQueueSmokeRateLimit(key);
    let thrown: unknown;
    try {
      assertInternalQueueSmokeRateLimit(key);
    } catch (e) {
      thrown = e;
    }
    expect(thrown).toBeInstanceOf(HttpException);
    expect((thrown as HttpException).getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
  });
});

describe('clientKeyFromQueueSmokeRequest', () => {
  it('uses first X-Forwarded-For hop when present', () => {
    const req = {
      headers: { 'x-forwarded-for': ' 203.0.113.1 , 10.0.0.1 ' },
      ip: '10.0.0.2',
      socket: {},
    } as unknown as Request;
    expect(clientKeyFromQueueSmokeRequest(req)).toBe('203.0.113.1');
  });

  it('uses first hop when X-Forwarded-For is a string array (Node / proxy)', () => {
    const combined = {
      headers: { 'x-forwarded-for': [' 203.0.113.2 , 10.0.0.1 '] },
      ip: '10.0.0.2',
      socket: {},
    } as unknown as Request;
    expect(clientKeyFromQueueSmokeRequest(combined)).toBe('203.0.113.2');

    const perHop = {
      headers: { 'x-forwarded-for': ['203.0.113.3', '10.0.0.1'] },
      ip: '10.0.0.2',
      socket: {},
    } as unknown as Request;
    expect(clientKeyFromQueueSmokeRequest(perHop)).toBe('203.0.113.3');
  });

  it('falls back to req.ip then socket.remoteAddress', () => {
    const onlyIp = {
      headers: {},
      ip: '192.0.2.10',
      socket: { remoteAddress: '::1' },
    } as unknown as Request;
    expect(clientKeyFromQueueSmokeRequest(onlyIp)).toBe('192.0.2.10');

    const onlySocket = {
      headers: {},
      ip: undefined,
      socket: { remoteAddress: '::ffff:127.0.0.1' },
    } as unknown as Request;
    expect(clientKeyFromQueueSmokeRequest(onlySocket)).toBe('::ffff:127.0.0.1');
  });

  it('returns unknown when no client hints', () => {
    const req = { headers: {}, socket: {} } as unknown as Request;
    expect(clientKeyFromQueueSmokeRequest(req)).toBe('unknown');
  });

  it('ignores empty X-Forwarded-For and falls back to req.ip', () => {
    const emptyString = {
      headers: { 'x-forwarded-for': '  , ' },
      ip: '192.0.2.44',
      socket: {},
    } as unknown as Request;
    expect(clientKeyFromQueueSmokeRequest(emptyString)).toBe('192.0.2.44');

    const skipEmptyEntries = {
      headers: { 'x-forwarded-for': ['', '  ', '198.51.100.9'] },
      ip: '10.0.0.2',
      socket: {},
    } as unknown as Request;
    expect(clientKeyFromQueueSmokeRequest(skipEmptyEntries)).toBe('198.51.100.9');
  });
});
