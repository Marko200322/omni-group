import { DealOfferService } from '../../../../modules/deal-offer/service/deal-offer.service';

const mockListByUser = jest.fn();
const mockCreate = jest.fn();

jest.mock('../../../../modules/deal-offer/repository/deal-offer.repository', () => ({
  DealOfferRepository: jest.fn().mockImplementation(() => ({
    listByUser: mockListByUser,
    create: mockCreate,
  })),
}));

describe('DealOfferService list / create', () => {
  let service: DealOfferService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new DealOfferService();
    mockListByUser.mockResolvedValue({ rows: [{ id: 'w1' }, { id: 'w2' }] });
    mockCreate.mockResolvedValue({ rows: [{ id: 'created', name: 'N' }] });
  });

  it('list returns rows from repository', async () => {
    const rows = await service.list('user-x');
    expect(mockListByUser).toHaveBeenCalledWith('user-x');
    expect(rows).toEqual([{ id: 'w1' }, { id: 'w2' }]);
  });

  it('create returns first inserted row', async () => {
    const dto = { name: 'Deal room', budgetAllocated: 0, mode: 'draft' as const };
    const row = await service.create('user-y', dto);
    expect(mockCreate).toHaveBeenCalledWith('user-y', 'Deal room', 0, 'draft');
    expect(row).toEqual({ id: 'created', name: 'N' });
  });
});
