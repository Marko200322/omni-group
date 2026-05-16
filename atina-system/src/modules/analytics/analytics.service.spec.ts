import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Contract } from '../../database/entities/contract.entity';
import { Invoice } from '../../database/entities/invoice.entity';
import { Lead } from '../../database/entities/lead.entity';
import { User } from '../../database/entities/user.entity';
import { PhaseService } from '../../phase-launch/phase.service';
import { AnalyticsService } from './analytics.service';

describe('AnalyticsService', () => {
  let moduleRef: TestingModule;
  let service: AnalyticsService;
  let usersRepo: jest.Mocked<Pick<Repository<User>, 'count'>>;
  let leadsRepo: jest.Mocked<Pick<Repository<Lead>, 'count'>>;
  let contractsRepo: jest.Mocked<Pick<Repository<Contract>, 'count'>>;
  let invoicesRepo: jest.Mocked<Pick<Repository<Invoice>, 'count'>>;
  let phase: jest.Mocked<
    Pick<PhaseService, 'getPhase' | 'isBillingEnabled' | 'isAiEnabled'>
  >;

  beforeEach(async () => {
    usersRepo = { count: jest.fn() };
    leadsRepo = { count: jest.fn() };
    contractsRepo = { count: jest.fn() };
    invoicesRepo = { count: jest.fn() };
    phase = {
      getPhase: jest.fn(),
      isBillingEnabled: jest.fn(),
      isAiEnabled: jest.fn(),
    };

    moduleRef = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        { provide: getRepositoryToken(User), useValue: usersRepo },
        { provide: getRepositoryToken(Lead), useValue: leadsRepo },
        { provide: getRepositoryToken(Contract), useValue: contractsRepo },
        { provide: getRepositoryToken(Invoice), useValue: invoicesRepo },
        { provide: PhaseService, useValue: phase },
      ],
    }).compile();

    service = moduleRef.get(AnalyticsService);
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  it('overview aggregates counts and defaults phase to v1', async () => {
    phase.getPhase.mockReturnValue('v1');
    phase.isBillingEnabled.mockReturnValue(false);
    phase.isAiEnabled.mockReturnValue(false);
    usersRepo.count.mockResolvedValue(2);
    leadsRepo.count.mockResolvedValue(5);
    contractsRepo.count.mockResolvedValue(1);
    invoicesRepo.count.mockResolvedValue(9);

    const result = await service.overview();

    expect(usersRepo.count).toHaveBeenCalled();
    expect(leadsRepo.count).toHaveBeenCalled();
    expect(contractsRepo.count).toHaveBeenCalled();
    expect(invoicesRepo.count).toHaveBeenCalled();
    expect(phase.getPhase).toHaveBeenCalled();
    expect(phase.isBillingEnabled).toHaveBeenCalled();
    expect(phase.isAiEnabled).toHaveBeenCalled();
    expect(result).toEqual({
      users: 2,
      leads: 5,
      contracts: 1,
      invoices: 9,
      phase: 'v1',
      billingEnabled: false,
      aiEnabled: false,
      system: 'Atina System (Titan blueprint → Atina)',
    });
  });

  it('overview uses PhaseService.getPhase() for phase', async () => {
    phase.getPhase.mockReturnValue('staging');
    phase.isBillingEnabled.mockReturnValue(false);
    phase.isAiEnabled.mockReturnValue(true);
    usersRepo.count.mockResolvedValue(0);
    leadsRepo.count.mockResolvedValue(0);
    contractsRepo.count.mockResolvedValue(0);
    invoicesRepo.count.mockResolvedValue(0);

    const result = await service.overview();

    expect(result.phase).toBe('staging');
    expect(result.billingEnabled).toBe(false);
    expect(result.aiEnabled).toBe(true);
  });

  it('overview reflects billing enabled for billing phases', async () => {
    phase.getPhase.mockReturnValue('v3');
    phase.isBillingEnabled.mockReturnValue(true);
    phase.isAiEnabled.mockReturnValue(true);
    usersRepo.count.mockResolvedValue(0);
    leadsRepo.count.mockResolvedValue(0);
    contractsRepo.count.mockResolvedValue(0);
    invoicesRepo.count.mockResolvedValue(0);

    const result = await service.overview();

    expect(result.billingEnabled).toBe(true);
    expect(result.aiEnabled).toBe(true);
  });
});
