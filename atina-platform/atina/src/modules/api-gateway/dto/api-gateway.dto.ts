import { z } from 'zod';

export const RegisterGatewayRouteDto = z
  .object({
    routeKey: z.string().min(3).max(120),
    upstreamSlug: z.string().min(2).max(80),
    pathTemplate: z.string().min(2).max(255),
    method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).default('GET'),
    rateLimitPerMinute: z.number().min(1).max(5000).default(120),
  })
  .strict();

export const ProxyRouteDto = z
  .object({
    routeKey: z.string().min(3).max(120),
    payload: z.record(z.unknown()).default({}),
  })
  .strict();
