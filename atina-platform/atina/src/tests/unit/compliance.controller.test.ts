import { Request, Response } from 'express';
import { ComplianceController } from '../../modules/compliance/controller/compliance.controller';
import { ComplianceService } from '../../modules/compliance/service/compliance.service';

jest.mock('../../modules/compliance/service/compliance.service');

const MockComplianceService = ComplianceService as jest.MockedClass<typeof ComplianceService>;

describe('ComplianceController', () => {
  let controller: ComplianceController;
  let mockService: jest.Mocked<ComplianceService>;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new ComplianceController();
    mockService = MockComplianceService.mock.instances[0] as jest.Mocked<ComplianceService>;
  });

  const res = (): Response => {
    const json = jest.fn().mockReturnThis();
    return {
      status: jest.fn().mockReturnThis(),
      json,
    } as unknown as Response;
  };

  it('record uses userId and body fields', async () => {
    const row = { id: 'c1' };
    mockService.record.mockResolvedValue(row as never);
    const r = res();
    const req = {
      user: { userId: 'u77', role: 'admin', email: 'a@b.com' },
      body: {
        framework: 'gdpr',
        controlKey: 'art32',
        status: 'warn',
        notes: 'gap',
        evidence: { ticket: '42' },
      },
    } as Request;
    await controller.record(req, r);
    expect(mockService.record).toHaveBeenCalledWith('u77', 'gdpr', 'art32', 'warn', 'gap', {
      ticket: '42',
    });
    expect(r.status).toHaveBeenCalledWith(201);
  });

  it('record uses null userId when unauthenticated', async () => {
    mockService.record.mockResolvedValue({ id: 'sys' } as never);
    const r = res();
    await controller.record(
      {
        body: {
          framework: 'internal',
          controlKey: 'chk-1',
          status: 'pass',
          notes: '',
          evidence: {},
        },
      } as Request,
      r
    );
    expect(mockService.record).toHaveBeenCalledWith(null, 'internal', 'chk-1', 'pass', '', {});
  });

  it('list forwards optional framework query', async () => {
    mockService.list.mockResolvedValue([] as never);
    const r = res();
    await controller.list({ query: { framework: 'soc2' } } as unknown as Request, r);
    expect(mockService.list).toHaveBeenCalledWith('soc2');

    await controller.list({ query: {} } as unknown as Request, res());
    expect(mockService.list).toHaveBeenCalledWith(undefined);
  });
});
