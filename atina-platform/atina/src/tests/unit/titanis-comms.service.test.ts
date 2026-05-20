import { TitanisService } from '../../modules/titanis/service/titanis.service';

// eslint-disable-next-line no-var
var titanisRepo: {
  getOwned: jest.Mock;
  createRun: jest.Mock;
  updateAfterRun: jest.Mock;
  auditRunCompleted: jest.Mock;
};

const mockComms = {
  isConfigured: jest.fn().mockReturnValue(true),
  request: jest.fn().mockResolvedValue({ ok: true }),
};

jest.mock('../../integrations', () => ({
  getAiClient: () => ({ isConfigured: () => false, fetchRecommendations: jest.fn() }),
  getCommsClient: () => mockComms,
}));

jest.mock('../../modules/titanis/repository/titanis.repository', () => {
  titanisRepo = {
    getOwned: jest.fn().mockResolvedValue({
      rows: [{ id: 'w1', config: { outreach_channel: 'email' } }],
    }),
    createRun: jest.fn().mockResolvedValue({ rows: [{ id: 'run-1' }] }),
    updateAfterRun: jest.fn().mockResolvedValue({ rowCount: 1 }),
    auditRunCompleted: jest.fn().mockResolvedValue(undefined),
  };
  return {
    TitanisRepository: jest.fn().mockImplementation(() => titanisRepo),
  };
});

describe('TitanisService COMMS', () => {
  it('dispatches comms on follow-up mode', async () => {
    const service = new TitanisService();
    await service.run('w1', 'u1', { mode: 'follow-up', targetCount: 10 });
    const payload = titanisRepo.createRun.mock.calls[0][2] as { comms_dispatched?: boolean };
    expect(payload.comms_dispatched).toBe(true);
    expect(mockComms.request).toHaveBeenCalled();
  });
});
