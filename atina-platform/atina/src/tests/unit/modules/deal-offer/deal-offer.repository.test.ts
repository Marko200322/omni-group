import { DealOfferRepository } from '../../../../modules/deal-offer/repository/deal-offer.repository';
import * as db from '../../../../database/connection';

jest.mock('../../../../database/connection');

const mockQuery = db.query as jest.MockedFunction<typeof db.query>;

describe('DealOfferRepository', () => {
  let repo: DealOfferRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 } as never);
    repo = new DealOfferRepository();
  });

  it('listByUser filters deal-offer slug for user', async () => {
    await repo.listByUser('user-7');
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("system_slug = 'deal-offer'"),
      ['user-7']
    );
  });

  it('create inserts slug, JSON config and metrics', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'new' }], rowCount: 1 } as never);
    await repo.create('u1', 'Workspace A', 5000, 'negotiate');
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO ecosystem_systems'),
      [
        'u1',
        'Workspace A',
        5000,
        JSON.stringify({ deal_mode: 'negotiate' }),
        JSON.stringify({ runs_completed: 0, offers_negotiated: 0, deals_closed: 0 }),
      ]
    );
  });

  it('getOwned scopes by id, user and slug', async () => {
    await repo.getOwned('sys-1', 'u1');
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('WHERE id = $1'), ['sys-1', 'u1']);
  });

  it('createRun inserts completed run with input and output payload JSON', async () => {
    const input = { mode: 'draft' as const, intensity: 10 };
    const output = { estimatedRevenue: 12, winProbability: 40 };
    await repo.createRun('sid', 'deal-offer_draft', input, output);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO ecosystem_runs'),
      ['sid', 'deal-offer_draft', JSON.stringify(input), JSON.stringify(output)]
    );
  });

  it('updateAfterRun passes revenue and metric deltas', async () => {
    await repo.updateAfterRun('sid', 42, 'close', 90, 1, 1);
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('UPDATE ecosystem_systems'), [
      'sid',
      42,
      'close',
      90,
      1,
      1,
    ]);
  });
});
