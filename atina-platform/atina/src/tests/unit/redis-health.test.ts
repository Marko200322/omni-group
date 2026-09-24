const connectMock = jest.fn();
const pingMock = jest.fn();
const quitMock = jest.fn();
const disconnectMock = jest.fn();
const onMock = jest.fn();

const client = {
  connect: connectMock,
  ping: pingMock,
  quit: quitMock,
  disconnect: disconnectMock,
  on: onMock,
  isOpen: true,
};

jest.mock('redis', () => ({
  createClient: jest.fn(() => client),
}));

import { createClient } from 'redis';
import { testRedisConnection } from '../../queue/redis-health';

describe('Redis health probe', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    client.isOpen = true;
    connectMock.mockResolvedValue(undefined);
    pingMock.mockResolvedValue('PONG');
    quitMock.mockResolvedValue(undefined);
  });

  it('returns true after PING and closes the probe client', async () => {
    await expect(testRedisConnection()).resolves.toBe(true);
    expect(createClient).toHaveBeenCalledWith(expect.objectContaining({
      socket: expect.objectContaining({ connectTimeout: 2000, reconnectStrategy: false }),
    }));
    expect(pingMock).toHaveBeenCalledTimes(1);
    expect(quitMock).toHaveBeenCalledTimes(1);
  });

  it('returns false and closes the client when PING fails', async () => {
    pingMock.mockRejectedValueOnce(new Error('redis unavailable'));
    await expect(testRedisConnection()).resolves.toBe(false);
    expect(quitMock).toHaveBeenCalledTimes(1);
  });
});
