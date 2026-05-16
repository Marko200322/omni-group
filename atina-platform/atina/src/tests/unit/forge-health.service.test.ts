import { getForgeHealthDetails } from '../../modules/forge/service/forge-health.service';
import { TitanForgeService } from '../../modules/forge/service/titan-forge.service';

jest.mock('../../modules/forge/service/titan-forge.service', () => ({
  TitanForgeService: jest.fn(),
}));

const TitanForgeServiceMock = TitanForgeService as jest.MockedClass<typeof TitanForgeService>;

describe('forge-health.service', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('returns available signal and freshness when recent event exists', async () => {
    const now = Date.now();
    const createdAt = new Date(now - 1000).toISOString();
    TitanForgeServiceMock.mockImplementation(() => ({
      getVaultPath: () => 'C:/tmp/test-forge-vault.db',
      getStatus: async () => ({
        providers: ['oracle', 'aws', 'azure'],
        nextProvider: 'oracle',
        budgetRsd: { initial: 4000, remaining: 3500, spent: 500 },
        budgetGuard: { minReserveRsd: 0, hardStopMode: false, availableToSpendRsd: 3500 },
        recentEvents: [
          {
            id: 'evt_1',
            provider: 'oracle',
            eventType: 'forge_smelt',
            costRsd: 100,
            createdAt,
          },
        ],
      }),
    }) as unknown as TitanForgeService);

    const result = await getForgeHealthDetails();

    expect(result.vaultPath).toBe('C:/tmp/test-forge-vault.db');
    expect(result.vaultSignal).toBe('available');
    expect(result.lastForgeEventAgeMs).toEqual(expect.any(Number));
    expect(result.lastForgeEventFresh).toBe(true);
  });

  it('returns unavailable signal and null freshness when vault access fails', async () => {
    TitanForgeServiceMock.mockImplementation(() => ({
      getVaultPath: () => 'C:/tmp/test-forge-vault.db',
      getStatus: async () => {
        throw new Error('vault unavailable');
      },
    }) as unknown as TitanForgeService);

    const result = await getForgeHealthDetails();

    expect(result).toEqual({
      vaultPath: 'C:/tmp/test-forge-vault.db',
      vaultSignal: 'unavailable',
      lastForgeEventAgeMs: null,
      lastForgeEventFresh: null,
    });
  });

  it('treats empty recent events as no measurable age', async () => {
    TitanForgeServiceMock.mockImplementation(() => ({
      getVaultPath: () => '/tmp/vault.db',
      getStatus: async () => ({
        providers: ['oracle', 'aws', 'azure'],
        nextProvider: 'oracle',
        budgetRsd: { initial: 4000, remaining: 4000, spent: 0 },
        budgetGuard: { minReserveRsd: 0, hardStopMode: false, availableToSpendRsd: 4000 },
        recentEvents: [],
      }),
    }) as unknown as TitanForgeService);

    const result = await getForgeHealthDetails();
    expect(result.vaultSignal).toBe('available');
    expect(result.lastForgeEventAgeMs).toBeNull();
    expect(result.lastForgeEventFresh).toBeNull();
  });

  it('marks stale when last event is older than freshness threshold', async () => {
    const old = new Date(Date.now() - 16 * 60 * 1000).toISOString();
    TitanForgeServiceMock.mockImplementation(() => ({
      getVaultPath: () => '/tmp/vault.db',
      getStatus: async () => ({
        providers: ['oracle', 'aws', 'azure'],
        nextProvider: 'oracle',
        budgetRsd: { initial: 4000, remaining: 4000, spent: 0 },
        budgetGuard: { minReserveRsd: 0, hardStopMode: false, availableToSpendRsd: 4000 },
        recentEvents: [
          { id: 'evt_old', provider: 'oracle', eventType: 'forge_smelt', costRsd: 1, createdAt: old },
        ],
      }),
    }) as unknown as TitanForgeService);

    const result = await getForgeHealthDetails();
    expect(result.lastForgeEventFresh).toBe(false);
    expect(result.lastForgeEventAgeMs).toBeGreaterThan(15 * 60 * 1000);
  });

  it('treats unparseable createdAt as no age', async () => {
    TitanForgeServiceMock.mockImplementation(() => ({
      getVaultPath: () => '/tmp/vault.db',
      getStatus: async () => ({
        providers: ['oracle', 'aws', 'azure'],
        nextProvider: 'oracle',
        budgetRsd: { initial: 4000, remaining: 4000, spent: 0 },
        budgetGuard: { minReserveRsd: 0, hardStopMode: false, availableToSpendRsd: 4000 },
        recentEvents: [
          { id: 'evt_x', provider: 'oracle', eventType: 'forge_smelt', costRsd: 1, createdAt: 'not-a-date' },
        ],
      }),
    }) as unknown as TitanForgeService);

    const result = await getForgeHealthDetails();
    expect(result.lastForgeEventAgeMs).toBeNull();
    expect(result.lastForgeEventFresh).toBeNull();
  });
});
