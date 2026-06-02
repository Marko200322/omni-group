import { z } from 'zod';

export const TrackEventDto = z
  .object({
    eventName: z.string().min(1).max(100),
    properties: z.record(z.unknown()).default({}),
    sessionId: z.string().optional(),
  })
  .strict();

export const AnalyticsDashboardQueryDto = z
  .object({
    range: z.preprocess(
      (v) => (v === undefined || v === '' ? undefined : v),
      z.string().optional()
    ),
  })
  .strict();

export const AnalyticsEventsQueryDto = z
  .object({
    page: z.preprocess(
      (v) => (v === undefined || v === '' ? 1 : v),
      z.coerce.number().int().min(1)
    ),
    limit: z.preprocess(
      (v) => (v === undefined || v === '' ? 50 : v),
      z.coerce.number().int().min(1).max(100)
    ),
  })
  .strict();

export type TrackEventDtoType = z.infer<typeof TrackEventDto>;
export type AnalyticsDashboardQueryDtoType = z.infer<typeof AnalyticsDashboardQueryDto>;
export type AnalyticsEventsQueryDtoType = z.infer<typeof AnalyticsEventsQueryDto>;
