import fs from 'fs';
import path from 'path';
import { DeliverableFulfillmentReadService } from '../../modules/billing/service/deliverable-fulfillment-read.service';
import type { FulfillmentJobRow } from '../../modules/billing/repository/deliverable-fulfillment.repository';

const mockRepo = {
  getByPaymentId: jest.fn(),
  listByUserId: jest.fn(),
  listAdmin: jest.fn(),
};

jest.mock('../../modules/billing/repository/deliverable-fulfillment.repository', () => {
  const actual = jest.requireActual('../../modules/billing/repository/deliverable-fulfillment.repository');
  const Mocked = jest.fn().mockImplementation(() => mockRepo) as unknown as typeof actual.DeliverableFulfillmentRepository;
  (Mocked as unknown as { readAttemptNumber: unknown }).readAttemptNumber =
    actual.DeliverableFulfillmentRepository.readAttemptNumber;
  return { ...actual, DeliverableFulfillmentRepository: Mocked };
});

function row(overrides: Partial<FulfillmentJobRow> = {}): FulfillmentJobRow {
  const now = new Date('2026-11-02T20:00:00Z');
  return {
    id: 'job-1',
    payment_id: 'pay-1',
    user_id: 'buyer-1',
    purchase_type: 'deliverable',
    deliverable_id: 'setup-quick',
    plan_slug: null,
    status: 'completed',
    result: {
      artifacts: [{ type: 'setup_pack', filename: 'setup-quick.pdf', storagePath: '/x/setup-quick.pdf' }],
      fulfillmentMeta: {
        attemptNumber: 2,
        checklist: {
          passed: true,
          score: 100,
          items: [{ id: 'pdf_artifact', passed: true, message: 'At least one PDF artifact delivered' }],
        },
      },
    },
    error: null,
    created_at: now,
    updated_at: now,
    completed_at: now,
    review_status: 'approved',
    review_notes: null,
    released_at: now,
    ...overrides,
  } as FulfillmentJobRow;
}

describe('DeliverableFulfillmentReadService', () => {
  let service: DeliverableFulfillmentReadService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new DeliverableFulfillmentReadService();
  });

  it('exposes the quality checklist to admins', async () => {
    mockRepo.getByPaymentId.mockResolvedValue(row());
    const job = await service.getJob('pay-1', 'admin-1', 'admin');
    expect(job.qualityChecklist).toEqual({
      passed: true,
      score: 100,
      items: [{ id: 'pdf_artifact', passed: true, message: 'At least one PDF artifact delivered' }],
      attemptNumber: 2,
    });
    expect(job.artifacts[0]).not.toHaveProperty('storagePath');
  });

  it('hides the quality checklist from the buying client', async () => {
    mockRepo.getByPaymentId.mockResolvedValue(row());
    const job = await service.getJob('pay-1', 'buyer-1', 'user');
    expect(job).not.toHaveProperty('qualityChecklist');
  });

  it('returns null checklist when the job has no quality gate result', async () => {
    mockRepo.listAdmin.mockResolvedValue([row({ result: { artifacts: [] } })]);
    const [job] = await service.listForAdmin({});
    expect(job.qualityChecklist).toBeNull();
  });

  it('appends the file extension to the download label', async () => {
    const storagePath = path.join(process.cwd(), 'data', 'client-deliverables', 'pay-1', 'setup-quick.pdf');
    mockRepo.getByPaymentId.mockResolvedValue(
      row({
        result: {
          artifacts: [
            { type: 'setup_pack', filename: 'setup-quick.pdf', downloadLabel: 'Quick Setup — Go-Live Checklist', storagePath },
          ],
        },
      }),
    );
    const existsSpy = jest.spyOn(fs, 'existsSync').mockReturnValue(true);
    try {
      const file = await service.getArtifactFile({
        paymentId: 'pay-1',
        filename: 'setup-quick.pdf',
        userId: 'buyer-1',
        role: 'user',
      });
      expect(file.downloadName).toBe('Quick Setup — Go-Live Checklist.pdf');
      expect(file.contentType).toBe('application/pdf');
    } finally {
      existsSpy.mockRestore();
    }
  });

  it('does not include the checklist in client job lists', async () => {
    mockRepo.listByUserId.mockResolvedValue([row()]);
    const [job] = await service.listForUser('buyer-1');
    expect(job).not.toHaveProperty('qualityChecklist');
  });
});
