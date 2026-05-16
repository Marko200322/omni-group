import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PhaseService } from '../../phase-launch/phase.service';
import { SupplyAgentHeartbeat } from '../../database/entities/supply-agent-heartbeat.entity';
import { VaultResource } from '../../database/entities/vault-resource.entity';
import { SupplyAgentService } from './supply-agent.service';

describe('SupplyAgentService', () => {
  let moduleRef: TestingModule;
  let service: SupplyAgentService;
  let vaultRepo: jest.Mocked<
    Pick<Repository<VaultResource>, 'count' | 'create' | 'save'>
  >;
  let heartbeatsRepo: jest.Mocked<
    Pick<
      Repository<SupplyAgentHeartbeat>,
      'create' | 'save' | 'find'
    >
  >;
  let phase: { getPhase: jest.Mock };

  beforeEach(async () => {
    vaultRepo = {
      count: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };
    heartbeatsRepo = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
    };
    phase = { getPhase: jest.fn().mockReturnValue('v2') };

    moduleRef = await Test.createTestingModule({
      providers: [
        SupplyAgentService,
        { provide: getRepositoryToken(VaultResource), useValue: vaultRepo },
        {
          provide: getRepositoryToken(SupplyAgentHeartbeat),
          useValue: heartbeatsRepo,
        },
        { provide: PhaseService, useValue: phase },
      ],
    }).compile();

    service = moduleRef.get(SupplyAgentService);
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  describe('status', () => {
    it('returns count and recent heartbeats', async () => {
      vaultRepo.count.mockResolvedValue(3);
      const beats = [{ id: 'h1' } as SupplyAgentHeartbeat];
      heartbeatsRepo.find.mockResolvedValue(beats);

      const result = await service.status();

      expect(vaultRepo.count).toHaveBeenCalled();
      expect(heartbeatsRepo.find).toHaveBeenCalledWith({
        order: { createdAt: 'DESC' },
        take: 5,
      });
      expect(result).toEqual({
        vaultResourceCount: 3,
        recentHeartbeats: beats,
      });
    });
  });

  describe('addResource', () => {
    it('persists resource with stringified payload', async () => {
      const created = {
        provider: 'aws',
        resourceType: 'queue',
        label: 'q1',
        payloadJson: '{"a":1}',
      } as VaultResource;
      vaultRepo.create.mockReturnValue(created);
      vaultRepo.save.mockResolvedValue({ ...created, id: 'uuid-1' });

      const saved = await service.addResource('aws', 'queue', 'q1', { a: 1 });

      expect(vaultRepo.create).toHaveBeenCalledWith({
        provider: 'aws',
        resourceType: 'queue',
        label: 'q1',
        payloadJson: '{"a":1}',
      });
      expect(vaultRepo.save).toHaveBeenCalledWith(created);
      expect(saved).toMatchObject({ id: 'uuid-1' });
    });

    it('stores null payload when omitted', async () => {
      const created = {
        provider: 'gcp',
        resourceType: 'bucket',
        label: 'b1',
        payloadJson: null,
      } as VaultResource;
      vaultRepo.create.mockReturnValue(created);
      vaultRepo.save.mockResolvedValue(created);

      await service.addResource('gcp', 'bucket', 'b1');

      expect(vaultRepo.create).toHaveBeenCalledWith({
        provider: 'gcp',
        resourceType: 'bucket',
        label: 'b1',
        payloadJson: null,
      });
    });

    it('stores null label when omitted or blank', async () => {
      const created = {
        provider: 'gcp',
        resourceType: 'bucket',
        label: null,
        payloadJson: null,
      } as VaultResource;
      vaultRepo.create.mockReturnValue(created);
      vaultRepo.save.mockResolvedValue(created);

      await service.addResource('gcp', 'bucket');

      expect(vaultRepo.create).toHaveBeenCalledWith({
        provider: 'gcp',
        resourceType: 'bucket',
        label: null,
        payloadJson: null,
      });

      vaultRepo.create.mockClear();
      await service.addResource('gcp', 'bucket', '  \t');
      expect(vaultRepo.create).toHaveBeenCalledWith({
        provider: 'gcp',
        resourceType: 'bucket',
        label: null,
        payloadJson: null,
      });
    });
  });

  describe('tick', () => {
    it('records heartbeat with vault count and phase', async () => {
      vaultRepo.count.mockResolvedValue(7);
      const hbRow = {
        resourceCount: 7,
        pendingWorkers: 0,
        phase: 'v2',
      } as SupplyAgentHeartbeat;
      heartbeatsRepo.create.mockReturnValue(hbRow);
      heartbeatsRepo.save.mockResolvedValue(hbRow);

      await service.tick();

      expect(vaultRepo.count).toHaveBeenCalled();
      expect(phase.getPhase).toHaveBeenCalled();
      expect(heartbeatsRepo.create).toHaveBeenCalledWith({
        resourceCount: 7,
        pendingWorkers: 0,
        phase: 'v2',
      });
      expect(heartbeatsRepo.save).toHaveBeenCalledWith(hbRow);
    });
  });
});
