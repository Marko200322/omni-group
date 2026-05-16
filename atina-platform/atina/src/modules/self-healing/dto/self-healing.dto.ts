import { z } from 'zod';

const emptyBody = (v: unknown): unknown => (v === undefined || v === null ? {} : v);

export const ReportIssueDto = z
  .object({
    subsystem: z.string().min(2).max(80),
    issueKey: z.string().min(2).max(120),
    details: z.record(z.unknown()).default({}),
  })
  .strict();

export const HealIssueDto = z
  .object({
    remediationAction: z.string().min(3).max(300),
  })
  .strict();

export const AutoScanDto = z.preprocess(
  emptyBody,
  z
    .object({
      includeTasks: z.boolean().default(true),
      includePayments: z.boolean().default(true),
      includeIntegrations: z.boolean().default(true),
    })
    .strict()
);

export const AutoHealDto = z.preprocess(
  emptyBody,
  z
    .object({
      maxEvents: z.number().int().min(0).max(100).default(20),
    })
    .strict()
);
