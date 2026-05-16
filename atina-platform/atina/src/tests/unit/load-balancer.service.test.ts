import { LoadBalancerService } from '../../modules/load-balancer/service/load-balancer.service';
import { NotFoundError } from '../../utils/errors';

// eslint-disable-next-line no-var
var loadBalancerRepo: {
  register: jest.Mock;
  listActive: jest.Mock;
  addLoad: jest.Mock;
};

jest.mock('../../modules/load-balancer/repository/load-balancer.repository', () => {
  loadBalancerRepo = {
    register: jest.fn(),
    listActive: jest.fn(),
    addLoad: jest.fn(),
  };
  return {
    LoadBalancerRepository: jest.fn().mockImplementation(() => loadBalancerRepo),
  };
});

describe('LoadBalancerService', () => {
  let service: LoadBalancerService;

  const sampleNode = {
    id: 'node-uuid-1',
    node_name: 'worker-a',
    zone: 'eu-west',
    capacity_score: 100,
    current_load_score: 10,
    is_active: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    loadBalancerRepo.register.mockReset();
    loadBalancerRepo.listActive.mockReset();
    loadBalancerRepo.addLoad.mockReset();
    service = new LoadBalancerService();
  });

  describe('register', () => {
    it('returns the first row from the repository', async () => {
      const row = { ...sampleNode, metadata: '{}' };
      loadBalancerRepo.register.mockResolvedValueOnce({ rows: [row], rowCount: 1 });

      const result = await service.register('worker-a', 'eu-west', 100, { role: 'compute' });

      expect(result).toBe(row);
      expect(loadBalancerRepo.register).toHaveBeenCalledWith('worker-a', 'eu-west', 100, { role: 'compute' });
    });

    it('passes empty metadata object through', async () => {
      loadBalancerRepo.register.mockResolvedValueOnce({ rows: [sampleNode], rowCount: 1 });

      await service.register('n', 'z', 0, {});

      expect(loadBalancerRepo.register).toHaveBeenCalledWith('n', 'z', 0, {});
    });

    it('returns undefined when repository returns no rows', async () => {
      loadBalancerRepo.register.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await expect(service.register('orphan', 'z', 1, {})).resolves.toBeUndefined();
    });

    it('passes negative capacity score through to the repository', async () => {
      loadBalancerRepo.register.mockResolvedValueOnce({ rows: [sampleNode], rowCount: 1 });

      await service.register('n', 'z', -1, { tier: 'test' });

      expect(loadBalancerRepo.register).toHaveBeenCalledWith('n', 'z', -1, { tier: 'test' });
    });

    it('passes nested metadata through unchanged', async () => {
      const metadata = { tags: ['a', 'b'], nested: { x: 1 } };
      loadBalancerRepo.register.mockResolvedValueOnce({ rows: [sampleNode], rowCount: 1 });

      await service.register('n', 'z', 1, metadata);

      expect(loadBalancerRepo.register).toHaveBeenCalledWith('n', 'z', 1, metadata);
    });
  });

  describe('list', () => {
    it('returns all rows from listActive', async () => {
      const rows = [sampleNode, { ...sampleNode, id: 'node-2', node_name: 'worker-b' }];
      loadBalancerRepo.listActive.mockResolvedValueOnce({ rows, rowCount: 2 });

      await expect(service.list()).resolves.toEqual(rows);
    });

    it('returns empty array when no active nodes', async () => {
      loadBalancerRepo.listActive.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await expect(service.list()).resolves.toEqual([]);
    });
  });

  describe('dispatch', () => {
    it('throws NotFoundError when there are no active nodes', async () => {
      loadBalancerRepo.listActive.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const err = await service.dispatch('any-key').catch((e: unknown) => e);
      expect(err).toBeInstanceOf(NotFoundError);
      expect((err as NotFoundError).message).toBe('Active node not found');
      expect(loadBalancerRepo.addLoad).not.toHaveBeenCalled();
    });

    it('throws NotFoundError when first active slot is missing (sparse rows)', async () => {
      loadBalancerRepo.listActive.mockResolvedValueOnce({ rows: [undefined as unknown as typeof sampleNode], rowCount: 1 });

      const err = await service.dispatch('k').catch((e: unknown) => e);
      expect(err).toBeInstanceOf(NotFoundError);
      expect(loadBalancerRepo.addLoad).not.toHaveBeenCalled();
    });

    it('selects the first active node and adds load based on workloadKey length (empty key → delta 1)', async () => {
      loadBalancerRepo.listActive.mockResolvedValueOnce({ rows: [sampleNode], rowCount: 1 });
      const updated = [{ ...sampleNode, current_load_score: 11 }];
      loadBalancerRepo.addLoad.mockResolvedValueOnce({ rows: updated, rowCount: 1 });

      const result = await service.dispatch('');

      expect(loadBalancerRepo.addLoad).toHaveBeenCalledWith('node-uuid-1', 1);
      expect(result).toEqual({
        node: updated[0],
        workloadKey: '',
        loadAdded: 1,
      });
    });

    it('computes delta as max(1, len % 7 + 1) for a short key', async () => {
      loadBalancerRepo.listActive.mockResolvedValueOnce({ rows: [sampleNode], rowCount: 1 });
      loadBalancerRepo.addLoad.mockResolvedValueOnce({
        rows: [{ ...sampleNode, current_load_score: 12 }],
        rowCount: 1,
      });

      await service.dispatch('a');

      expect(loadBalancerRepo.addLoad).toHaveBeenCalledWith('node-uuid-1', 2);
    });

    it('computes delta 7 when length is 6 (6 % 7 + 1)', async () => {
      loadBalancerRepo.listActive.mockResolvedValueOnce({ rows: [sampleNode], rowCount: 1 });
      loadBalancerRepo.addLoad.mockResolvedValueOnce({
        rows: [{ ...sampleNode, current_load_score: 17 }],
        rowCount: 1,
      });

      await service.dispatch('abcdef');

      expect(loadBalancerRepo.addLoad).toHaveBeenCalledWith('node-uuid-1', 7);
    });

    it('computes delta 1 when length is a multiple of 7', async () => {
      loadBalancerRepo.listActive.mockResolvedValueOnce({ rows: [sampleNode], rowCount: 1 });
      loadBalancerRepo.addLoad.mockResolvedValueOnce({
        rows: [{ ...sampleNode, current_load_score: 11 }],
        rowCount: 1,
      });

      await service.dispatch('abcdefg');

      expect(loadBalancerRepo.addLoad).toHaveBeenCalledWith('node-uuid-1', 1);
    });

    it('always targets only the first active node when multiple are returned', async () => {
      const second = { ...sampleNode, id: 'node-uuid-2', node_name: 'worker-b' };
      loadBalancerRepo.listActive.mockResolvedValueOnce({ rows: [sampleNode, second], rowCount: 2 });
      loadBalancerRepo.addLoad.mockResolvedValueOnce({
        rows: [{ ...sampleNode, current_load_score: 15 }],
        rowCount: 1,
      });

      await service.dispatch('job-1');

      expect(loadBalancerRepo.addLoad).toHaveBeenCalledTimes(1);
      expect(loadBalancerRepo.addLoad).toHaveBeenCalledWith('node-uuid-1', 6);
    });

    it('returns node undefined when addLoad returns no rows', async () => {
      loadBalancerRepo.listActive.mockResolvedValueOnce({ rows: [sampleNode], rowCount: 1 });
      loadBalancerRepo.addLoad.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await expect(service.dispatch('x')).resolves.toEqual({
        node: undefined,
        workloadKey: 'x',
        loadAdded: 2,
      });
    });
  });
});
