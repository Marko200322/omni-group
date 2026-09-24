jest.mock('../../../../database/connection');

import { query } from '../../../../database/connection';
import { OutboundQueueRepository } from '../../../../modules/autonomy-loop/repository/outbound-queue.repository';

const mockQuery = query as jest.MockedFunction<typeof query>;

describe('OutboundQueueRepository retry policy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 } as never);
  });

  it('only lists queued messages whose retry delay elapsed', async () => {
    await new OutboundQueueRepository().listQueued(25);

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('next_attempt_at <= NOW()'),
      [25],
    );
  });

  it('increments attempts and dead-letters messages at max attempts', async () => {
    await new OutboundQueueRepository().recordTransientFailure('out-1', 'provider unavailable');

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("THEN 'dead_letter'"),
      ['out-1', 'provider unavailable'],
    );
    expect(String(mockQuery.mock.calls[0][0])).toContain('attempt_count = attempt_count + 1');
    expect(String(mockQuery.mock.calls[0][0])).toContain("INTERVAL '6 hours'");
  });
});
