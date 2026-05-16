import { Test, TestingModule } from '@nestjs/testing';
import { AddVaultResourceDto } from './dto/add-vault-resource.dto';
import { SupplyAgentService } from './supply-agent.service';
import { SupplyCoreController } from './supply-core.controller';

describe('SupplyCoreController', () => {
  let moduleRef: TestingModule;
  let controller: SupplyCoreController;
  let agent: jest.Mocked<
    Pick<SupplyAgentService, 'status' | 'addResource'>
  >;

  beforeEach(async () => {
    agent = {
      status: jest.fn(),
      addResource: jest.fn(),
    };

    moduleRef = await Test.createTestingModule({
      controllers: [SupplyCoreController],
      providers: [{ provide: SupplyAgentService, useValue: agent }],
    }).compile();

    controller = moduleRef.get(SupplyCoreController);
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  it('GET vault/status proxies to agent.status()', async () => {
    const payload = { vaultResourceCount: 0, recentHeartbeats: [] };
    agent.status.mockResolvedValue(payload);

    const result = await controller.status();

    expect(agent.status).toHaveBeenCalled();
    expect(result).toBe(payload);
  });

  it('POST vault/resource forwards body to addResource', async () => {
    const saved = { id: 'r1' };
    agent.addResource.mockResolvedValue(saved as never);

    const result = await controller.addResource({
      provider: 'x',
      resourceType: 'y',
      label: 'z',
      payload: { k: 1 },
    });

    expect(agent.addResource).toHaveBeenCalledWith('x', 'y', 'z', { k: 1 });
    expect(result).toBe(saved);
  });

  it('POST vault/resource forwards undefined label when omitted', async () => {
    agent.addResource.mockResolvedValue({ id: 'r2' } as never);

    await controller.addResource(
      Object.assign(new AddVaultResourceDto(), {
        provider: 'x',
        resourceType: 'y',
      }),
    );

    expect(agent.addResource).toHaveBeenCalledWith('x', 'y', undefined, undefined);
  });
});
