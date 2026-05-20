import { FollowUpService } from '../../../../modules/follow-up/service/follow-up.service';

// eslint-disable-next-line no-var
var followUpRepo: {
  getOwned: jest.Mock;
  createRun: jest.Mock;
  updateAfterRun: jest.Mock;
};

const mockComms = {
  isConfigured: jest.fn().mockReturnValue(true),
  request: jest.fn().mockResolvedValue({ ok: true }),
};

jest.mock('../../../../integrations', () => ({
  getCommsClient: () => mockComms,
}));

jest.mock('../../../../modules/follow-up/repository/follow-up.repository', () => {
  followUpRepo = {
    getOwned: jest.fn().mockResolvedValue({ rows: [{ id: 'sid' }] }),
    createRun: jest.fn().mockResolvedValue({ rows: [{ id: 'run-1' }] }),
    updateAfterRun: jest.fn().mockResolvedValue({ rowCount: 1 }),
  };
  return {
    FollowUpRepository: jest.fn().mockImplementation(() => followUpRepo),
  };
});

describe('FollowUpService COMMS', () => {
  it('sets comms_dispatched on schedule mode', async () => {
    const service = new FollowUpService();
    await service.run('sid', 'u1', { mode: 'schedule', intensity: 25 });
    const payload = followUpRepo.createRun.mock.calls[0][2] as { comms_dispatched?: boolean };
    expect(payload.comms_dispatched).toBe(true);
    expect(mockComms.request).toHaveBeenCalledWith('POST', '/v1/follow-up/dispatch', expect.any(Object));
  });
});
