import { OutreachService } from '../../../../modules/outreach/service/outreach.service';

// eslint-disable-next-line no-var
var outreachRepo: {
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

jest.mock('../../../../modules/outreach/repository/outreach.repository', () => {
  outreachRepo = {
    getOwned: jest.fn().mockResolvedValue({ rows: [{ id: 'sid' }] }),
    createRun: jest.fn().mockResolvedValue({ rows: [{ id: 'run-1' }] }),
    updateAfterRun: jest.fn().mockResolvedValue({ rowCount: 1 }),
  };
  return {
    OutreachRepository: jest.fn().mockImplementation(() => outreachRepo),
  };
});

describe('OutreachService COMMS', () => {
  it('sets comms_dispatched on send mode', async () => {
    const service = new OutreachService();
    await service.run('sid', 'u1', { mode: 'send', intensity: 50 });
    const payload = outreachRepo.createRun.mock.calls[0][2] as { comms_dispatched?: boolean };
    expect(payload.comms_dispatched).toBe(true);
    expect(mockComms.request).toHaveBeenCalledWith('POST', '/v1/outreach/dispatch', expect.any(Object));
  });
});
