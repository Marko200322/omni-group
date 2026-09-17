import { RecallWebhookService } from '../../modules/live-call-avatar/service/recall-webhook.service';

const mergeMetadata = jest.fn().mockResolvedValue({ rows: [] });
const updateStatus = jest.fn().mockResolvedValue({ rows: [{ status: 'ended' }] });
const findByRecallBotId = jest.fn().mockResolvedValue({
  rows: [{ id: '550e8400-e29b-41d4-a716-446655440099' }],
});

jest.mock('../../modules/live-call-avatar/repository/live-sessions.repository', () => ({
  LiveCallSessionsRepository: jest.fn().mockImplementation(() => ({
    findByRecallBotId,
    mergeMetadata,
    updateStatus,
  })),
}));

describe('RecallWebhookService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('merges metadata for live session from bot metadata', async () => {
    const svc = new RecallWebhookService();
    const result = await svc.handle({
      event: 'bot.status_change',
      data: {
        id: 'bot-123',
        status: 'in_call',
        metadata: { liveSessionId: '550e8400-e29b-41d4-a716-446655440099' },
      },
    });
    expect(result.ok).toBe(true);
    expect(result.sessionId).toBe('550e8400-e29b-41d4-a716-446655440099');
    expect(mergeMetadata).toHaveBeenCalled();
  });

  it('resolves session by recall bot id when metadata missing', async () => {
    const svc = new RecallWebhookService();
    await svc.handle({
      event: 'bot.done',
      data: { id: 'bot-456', status: 'done' },
    });
    expect(findByRecallBotId).toHaveBeenCalledWith('bot-456');
    expect(updateStatus).toHaveBeenCalled();
  });
});
