/**
 * Shared types for the Omni double-agent outreach engine.
 */
import { z } from 'zod';

export const LeadSourceSchema = z.enum([
  'reddit',
  'hackernews',
  'forum',
  'web',
  'manual',
]);
export type LeadSource = z.infer<typeof LeadSourceSchema>;

export const CatalogPackageSchema = z.object({
  id: z.string().min(2).max(64),
  name: z.string(),
  description: z.string(),
  billing: z.enum(['one_time', 'monthly', 'yearly']),
  category: z.string().optional(),
  anchorEur: z.number().nonnegative().optional(),
  priceEur: z.number().nonnegative().optional(),
  includes: z.array(z.string()).optional(),
  excludes: z.array(z.string()).optional(),
  modules: z.array(z.string()).optional(),
  checkoutPath: z.string().optional(),
});
export type CatalogPackage = z.infer<typeof CatalogPackageSchema>;

export const BrandModuleSchema = z.object({
  id: z.enum(['atina', 'astra', 'titan']),
  name: z.string(),
  tagline: z.string(),
  description: z.string(),
});
export type BrandModule = z.infer<typeof BrandModuleSchema>;

export const TermsPolicySchema = z.object({
  allowedGuarantees: z.array(z.string()).default([]),
  forbiddenClaims: z.array(z.string()).default([]),
  refundPolicySummary: z.string().optional(),
  slaSummary: z.string().optional(),
  disclaimerFooter: z.string(),
});
export type TermsPolicy = z.infer<typeof TermsPolicySchema>;

export const SourceOfTruthSchema = z.object({
  fetchedAt: z.string(),
  brandName: z.literal('Omni Group Tech'),
  publicSiteUrl: z.string().url(),
  checkoutBaseUrl: z.string().url(),
  modules: z.array(BrandModuleSchema),
  packages: z.array(CatalogPackageSchema).min(1),
  terms: TermsPolicySchema,
  allowedFeaturePhrases: z.array(z.string()).default([]),
});
export type SourceOfTruth = z.infer<typeof SourceOfTruthSchema>;

export const RawLeadSchema = z.object({
  id: z.string(),
  source: LeadSourceSchema,
  title: z.string().max(500),
  body: z.string().max(8000),
  url: z.string().url().optional(),
  authorHandle: z.string().max(120).optional(),
  discoveredAt: z.string(),
});
export type RawLead = z.infer<typeof RawLeadSchema>;

/** PII-stripped lead passed to LLMs */
export const SanitizedLeadSchema = z.object({
  id: z.string(),
  source: LeadSourceSchema,
  title: z.string(),
  bodyExcerpt: z.string().max(2500),
  urlHost: z.string().optional(),
  discoveredAt: z.string(),
});
export type SanitizedLead = z.infer<typeof SanitizedLeadSchema>;

export const Agent1OutputSchema = z.object({
  relevanceScore: z.number().min(1).max(10),
  discard: z.boolean(),
  discardReason: z.string().optional(),
  recommendedPackageId: z.string().nullable(),
  recommendedModule: z.enum(['atina', 'astra', 'titan', 'none']).optional(),
  subject: z.string().max(200).optional(),
  draftMessage: z.string().max(4000),
  checkoutPackageId: z.string().nullable().optional(),
  claimedFeatures: z.array(z.string()).default([]),
  claimedPriceEur: z.number().nullable().optional(),
  claimedDeliveryDays: z.number().nullable().optional(),
  toneNotes: z.string().optional(),
});
export type Agent1Output = z.infer<typeof Agent1OutputSchema>;

export const SupervisorStatusSchema = z.enum(['APPROVED', 'REJECTED', 'REWRITTEN']);
export type SupervisorStatus = z.infer<typeof SupervisorStatusSchema>;

export const Agent2OutputSchema = z.object({
  status: SupervisorStatusSchema,
  reasons: z.array(z.string()).default([]),
  rewrittenMessage: z.string().max(4000).optional(),
  finalMessage: z.string().max(4500),
  factualityScore: z.number().min(0).max(1),
  checklist: z.object({
    featureMatching: z.boolean(),
    pricingIntegrity: z.boolean(),
    guaranteesAndSla: z.boolean(),
    spamTone: z.boolean(),
    checkoutLinkValid: z.boolean(),
  }),
  approvedCheckoutUrl: z.string().url().nullable().optional(),
});
export type Agent2Output = z.infer<typeof Agent2OutputSchema>;

export const GuardrailFindingSchema = z.object({
  code: z.string(),
  severity: z.enum(['block', 'warn']),
  message: z.string(),
  evidence: z.string().optional(),
});
export type GuardrailFinding = z.infer<typeof GuardrailFindingSchema>;

export const GuardrailResultSchema = z.object({
  ok: z.boolean(),
  status: SupervisorStatusSchema,
  factualityScore: z.number().min(0).max(1),
  findings: z.array(GuardrailFindingSchema),
  finalMessage: z.string(),
  approvedCheckoutUrl: z.string().nullable(),
});
export type GuardrailResult = z.infer<typeof GuardrailResultSchema>;

export const AuditEventSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  leadId: z.string(),
  stage: z.enum([
    'discovered',
    'scored',
    'drafted',
    'supervised',
    'guardrail',
    'dispatched',
    'rejected',
    'error',
  ]),
  relevanceScore: z.number().optional(),
  packageId: z.string().nullable().optional(),
  supervisorStatus: SupervisorStatusSchema.optional(),
  factualityScore: z.number().optional(),
  outboundChannel: z.enum(['none', 'draft', 'email', 'webhook']).optional(),
  payloadSummary: z.record(z.unknown()).optional(),
  error: z.string().optional(),
});
export type AuditEvent = z.infer<typeof AuditEventSchema>;
