jest.mock('../../integrations', () => ({
  getAiClient: jest.fn(),
}));

jest.mock('../../modules/ai-rag/service/ai-rag.service', () => ({
  AiRagService: jest.fn().mockImplementation(() => ({
    search: jest.fn().mockResolvedValue({ hits: [{ content: 'KB: reset password via portal Settings.' }] }),
  })),
}));

jest.mock('../../modules/notifications/service/notifications.service', () => ({
  NotificationsService: jest.fn().mockImplementation(() => ({
    createNotification: jest.fn().mockResolvedValue({ id: 'n1' }),
  })),
}));

const getTaskById = jest.fn();
const patchTaskPayload = jest.fn().mockResolvedValue(undefined);

jest.mock('../../modules/tasks/repository/tasks.repository', () => ({
  TasksRepository: jest.fn().mockImplementation(() => ({
    getTaskById,
    patchTaskPayload,
  })),
}));

import { getAiClient } from '../../integrations';
import { SupportTicketAgentService } from '../../modules/support/service/support-ticket-agent.service';
import { executeTaskByType } from '../../modules/tasks/execute-task-by-type';

describe('SupportTicketAgentService — solves tickets, not report-only', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getTaskById.mockResolvedValue({
      rows: [
        {
          id: 'task-1',
          user_id: 'user-1',
          name: 'Cannot download invoice',
          description: 'Billing page shows empty after purchase of audit.',
          payload: { deliverableId: 'audit', status: 'open' },
        },
      ],
    });
  });

  it('records honest handoff when AI is not configured', async () => {
    (getAiClient as jest.Mock).mockReturnValue({
      isConfigured: () => false,
      chatCompletions: jest.fn(),
    });
    const agent = new SupportTicketAgentService();
    const result = await agent.solveFromJobPayload('support_ticket', { taskId: 'task-1' });
    expect(result.executed).toBe(true);
    expect(result.solved).toBe(false);
    expect(result.needsHuman).toBe(true);
    expect(result.actionSteps.length).toBeGreaterThanOrEqual(2);
    expect(patchTaskPayload).toHaveBeenCalled();
    const payload = patchTaskPayload.mock.calls[0][1] as { aiSolver?: { needsHuman?: boolean } };
    expect(payload.aiSolver?.needsHuman).toBe(true);
  });

  it('persists concrete AI resolution when solver returns high-confidence steps', async () => {
    (getAiClient as jest.Mock).mockReturnValue({
      isConfigured: () => true,
      chatCompletions: jest.fn().mockResolvedValue({
        content: JSON.stringify({
          solved: true,
          confidence: 'high',
          resolutionSummary: 'Open Billing → Invoices and download INV for this payment.',
          actionSteps: [
            'Open /dashboard/billing',
            'Download the invoice linked to payment for audit',
            'If still empty, reply with payment id',
          ],
          needsHuman: false,
        }),
      }),
    });
    const agent = new SupportTicketAgentService();
    const result = await agent.solveFromJobPayload('support_ticket', { taskId: 'task-1' });
    expect(result.solved).toBe(true);
    expect(result.needsHuman).toBe(false);
    expect(result.actionSteps).toHaveLength(3);
    expect(result.resolutionSummary).toMatch(/Billing/i);
    expect(patchTaskPayload).toHaveBeenCalledWith(
      'task-1',
      expect.objectContaining({
        status: 'resolved_by_ai',
        aiSolver: expect.objectContaining({ solved: true, confidence: 'high' }),
      }),
    );
  });

  it('executeTaskByType routes support_ticket / support_automation / ai_support_ops to the agent', async () => {
    // Lazy agent reads getAiClient at first solve — mock must be set before routing.
    (getAiClient as jest.Mock).mockReturnValue({
      isConfigured: () => false,
      chatCompletions: jest.fn(),
    });
    for (const type of ['support_ticket', 'support_automation', 'ai_support_ops'] as const) {
      const out = (await executeTaskByType(type, { taskId: 'task-1' })) as {
        type: string;
        executed: boolean;
      };
      expect(out.executed).toBe(true);
      expect(out.type).toBe(type);
    }
  });
});
