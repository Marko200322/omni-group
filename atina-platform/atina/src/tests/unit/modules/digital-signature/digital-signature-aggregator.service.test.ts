import { DigitalSignatureService } from '../../../../modules/digital-signature/service/digital-signature.service';

// eslint-disable-next-line no-var
var repo: {
  getOwned: jest.Mock;
  createRun: jest.Mock;
  updateAfterRun: jest.Mock;
  auditRunCompleted: jest.Mock;
};

const mockBusinessDev = {
  isConfigured: jest.fn().mockReturnValue(true),
  request: jest.fn().mockResolvedValue({ signed: true, provider: 'remote' }),
};

jest.mock('../../../../integrations', () => ({
  getBusinessDevClient: () => mockBusinessDev,
}));

jest.mock('../../../../modules/digital-signature/repository/digital-signature.repository', () => {
  repo = {
    getOwned: jest.fn().mockResolvedValue({ rows: [{ id: 'sid' }] }),
    createRun: jest.fn().mockResolvedValue({ rows: [{ id: 'run-1' }] }),
    updateAfterRun: jest.fn().mockResolvedValue({ rowCount: 1 }),
    auditRunCompleted: jest.fn().mockResolvedValue(undefined),
  };
  return {
    DigitalSignatureRepository: jest.fn().mockImplementation(() => repo),
  };
});

describe('DigitalSignatureService BUSINESS_AND_DEV', () => {
  it('merges aggregator result into run output', async () => {
    const service = new DigitalSignatureService();
    await service.run('sid', 'u1', { mode: 'request', input: { doc: 'a.pdf' } });
    const output = repo.createRun.mock.calls[0][3] as { result: { source?: string; signed?: boolean } };
    expect(output.result.source).toBe('business_dev_aggregator');
    expect(output.result.signed).toBe(true);
    expect(mockBusinessDev.request).toHaveBeenCalled();
  });
});
