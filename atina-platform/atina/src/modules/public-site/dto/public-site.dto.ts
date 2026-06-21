import { z } from 'zod';

export const VerticalSlugParamDto = z.object({
  slug: z.string().min(1).max(120),
});

export const ClientSiteSlugParamDto = z.object({
  slug: z.string().min(1).max(128),
});

export const ListSolutionsQueryDto = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(24),
  category: z.string().max(80).optional(),
  q: z.string().max(120).optional(),
});

export const CreateClientSiteDto = z.object({
  slug: z.string().min(2).max(128).regex(/^[a-z0-9-]+$/),
  title: z.string().min(2).max(255),
  tagline: z.string().max(500).optional(),
  siteType: z.enum(['landing', 'business', 'ecommerce']).optional().default('business'),
  projectId: z.string().uuid().optional(),
  branding: z.record(z.unknown()).optional(),
  pages: z
    .array(
      z.object({
        slug: z.string().min(1).max(64),
        title: z.string().min(1).max(255),
        body: z.string().max(20000),
        kind: z.enum(['home', 'about', 'services', 'pricing', 'contact', 'shop', 'custom']).optional(),
      }),
    )
    .optional(),
  publish: z.boolean().optional(),
});

export const PublishClientSiteDto = z.object({
  publish: z.boolean(),
});

export type ListSolutionsQueryDtoType = z.infer<typeof ListSolutionsQueryDto>;
export type CreateClientSiteDtoType = z.infer<typeof CreateClientSiteDto>;
