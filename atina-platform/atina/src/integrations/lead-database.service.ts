import { config } from '../config';
import logger from '../utils/logger';
import type { EmailVerifyResult, LeadProviderId, LeadRecord, LeadSearchQuery } from './lead-databases/types';
import { uniqueDomainsFromLinks } from './lead-databases/utils';
import { leadRolloutPhaseLabel, resolveLeadPhaseCapabilities } from './lead-databases/phased-rollout';
import { isApolloConfigured, searchApollo } from './lead-databases/providers/apollo.provider';
import { isHunterConfigured, searchHunter } from './lead-databases/providers/hunter.provider';
import { isLushaConfigured, searchLusha } from './lead-databases/providers/lusha.provider';
import { isSnovConfigured, searchSnov } from './lead-databases/providers/snov.provider';
import { isZoomInfoConfigured, searchZoomInfo } from './lead-databases/providers/zoominfo.provider';
import { isNeverBounceConfigured, verifyNeverBounce } from './lead-databases/email-verify/neverbounce.provider';
import { isZeroBounceConfigured, verifyZeroBounce } from './lead-databases/email-verify/zerobounce.provider';

export type LeadDatabaseStatus = {
  enabled: boolean;
  phase: string;
  phaseLabel: string;
  enrichOnHunt: boolean;
  verifyOnHunt: boolean;
  verifyEmailsAvailable: boolean;
  requireVerifiedEmail: boolean;
  maxPerRun: number;
  providerChain: string[];
  verifyChain: string[];
  providers: Record<string, { configured: boolean }>;
  emailVerifiers: Record<string, { configured: boolean }>;
};

export class LeadDatabaseService {
  getStatus(): LeadDatabaseStatus {
    const caps = resolveLeadPhaseCapabilities();
    const ld = config.leadDatabases;
    return {
      enabled: ld.enabled,
      phase: caps.phase,
      phaseLabel: leadRolloutPhaseLabel(caps.phase),
      enrichOnHunt: caps.enrichOnHunt,
      verifyOnHunt: caps.verifyOnHunt,
      verifyEmailsAvailable: caps.verifyEmailsAvailable,
      requireVerifiedEmail: caps.requireVerifiedEmail,
      maxPerRun: caps.maxPerRun,
      providerChain: caps.providerChain,
      verifyChain: caps.verifyChain,
      providers: {
        apollo: { configured: isApolloConfigured(ld.apolloApiKey) },
        hunter: { configured: isHunterConfigured(ld.hunterApiKey) },
        lusha: { configured: isLushaConfigured(ld.lushaApiKey) },
        snov: { configured: isSnovConfigured(ld.snovApiKey, ld.snovUserId) },
        zoominfo: { configured: isZoomInfoConfigured(ld.zoominfoApiKey) },
      },
      emailVerifiers: {
        neverbounce: { configured: isNeverBounceConfigured(ld.neverbounceApiKey) },
        zerobounce: { configured: isZeroBounceConfigured(ld.zerobounceApiKey) },
      },
    };
  }

  isEnrichmentActive(): boolean {
    const caps = resolveLeadPhaseCapabilities();
    if (!caps.enrichOnHunt || caps.maxPerRun <= 0) return false;
    return caps.providerChain.some((id) => this.isProviderConfigured(id as LeadProviderId));
  }

  isProviderConfigured(id: LeadProviderId): boolean {
    const ld = config.leadDatabases;
    switch (id) {
      case 'apollo':
        return isApolloConfigured(ld.apolloApiKey);
      case 'hunter':
        return isHunterConfigured(ld.hunterApiKey);
      case 'lusha':
        return isLushaConfigured(ld.lushaApiKey);
      case 'snov':
        return isSnovConfigured(ld.snovApiKey, ld.snovUserId);
      case 'zoominfo':
        return isZoomInfoConfigured(ld.zoominfoApiKey);
      default:
        return false;
    }
  }

  async searchPeople(query: LeadSearchQuery): Promise<LeadRecord[]> {
    const caps = resolveLeadPhaseCapabilities();
    const limit = Math.min(query.limit ?? caps.maxPerRun, caps.maxPerRun);
    if (!caps.enrichOnHunt || limit <= 0) return [];

    for (const rawId of caps.providerChain) {
      const id = rawId.trim().toLowerCase() as LeadProviderId;
      if (!this.isProviderConfigured(id)) continue;
      try {
        const rows = await this.searchWithProvider(id, { ...query, limit });
        if (rows.length) {
          return this.applyVerification(rows, caps.verifyOnHunt, caps.requireVerifiedEmail);
        }
      } catch (err) {
        logger.warn('Lead database provider failed', { provider: id, error: String(err) });
      }
    }
    return [];
  }

  /** Hunt context: domeni iz scrape linkova + keywords iz vertikale. */
  async enrichFromHuntContext(input: {
    verticalSlug: string;
    verticalName?: string;
    sampleLinks?: string[];
  }): Promise<LeadRecord[]> {
    const caps = resolveLeadPhaseCapabilities();
    if (!caps.enrichOnHunt) return [];

    const domains = uniqueDomainsFromLinks(input.sampleLinks ?? [], 3);
    const keywords = input.verticalName ?? input.verticalSlug.replace(/-/g, ' ');
    const all: LeadRecord[] = [];

    if (domains.length) {
      for (const domain of domains) {
        const batch = await this.searchPeople({
          companyDomain: domain,
          keywords,
          limit: Math.max(1, Math.floor(caps.maxPerRun / domains.length)),
        });
        all.push(...batch);
        if (all.length >= caps.maxPerRun) break;
      }
    }

    if (all.length < caps.maxPerRun) {
      const apolloBatch = await this.searchPeople({
        keywords,
        limit: caps.maxPerRun - all.length,
      });
      all.push(...apolloBatch);
    }

    const seen = new Set<string>();
    return all.filter((r) => {
      const key = (r.email ?? `${r.firstName}-${r.company}`).toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return Boolean(r.email || r.firstName);
    });
  }

  async verifyEmail(email: string): Promise<EmailVerifyResult | null> {
    const caps = resolveLeadPhaseCapabilities();
    if (!caps.verifyEmailsAvailable) return null;

    for (const rawId of caps.verifyChain) {
      const id = rawId.trim().toLowerCase();
      try {
        if (id === 'neverbounce' && isNeverBounceConfigured(config.leadDatabases.neverbounceApiKey)) {
          return await verifyNeverBounce(config.leadDatabases.neverbounceApiKey, email);
        }
        if (id === 'zerobounce' && isZeroBounceConfigured(config.leadDatabases.zerobounceApiKey)) {
          return await verifyZeroBounce(config.leadDatabases.zerobounceApiKey, email);
        }
      } catch (err) {
        logger.warn('Email verify provider failed', { provider: id, error: String(err) });
      }
    }
    return null;
  }

  private async searchWithProvider(id: LeadProviderId, query: LeadSearchQuery): Promise<LeadRecord[]> {
    const ld = config.leadDatabases;
    switch (id) {
      case 'apollo':
        return searchApollo(ld.apolloApiKey, query);
      case 'hunter':
        return searchHunter(ld.hunterApiKey, query);
      case 'lusha':
        return searchLusha(ld.lushaApiKey, query);
      case 'snov':
        return searchSnov(ld.snovApiKey, ld.snovUserId, query);
      case 'zoominfo':
        return searchZoomInfo(ld.zoominfoApiKey, query);
      default:
        return [];
    }
  }

  private async applyVerification(
    rows: LeadRecord[],
    verify: boolean,
    requireVerified: boolean
  ): Promise<LeadRecord[]> {
    if (!verify) return rows.filter((r) => r.email);

    const out: LeadRecord[] = [];
    for (const row of rows) {
      if (!row.email) continue;
      const v = await this.verifyEmail(row.email);
      const deliverable = v ? v.deliverable : !requireVerified;
      if (requireVerified && !deliverable) continue;
      out.push({
        ...row,
        verified: v?.deliverable ?? row.verified,
        raw: { ...row.raw, emailVerify: v },
      });
    }
    return out;
  }
}

let defaultLeadDatabaseService: LeadDatabaseService | undefined;

export function getLeadDatabaseService(override?: LeadDatabaseService): LeadDatabaseService {
  if (override) return override;
  if (!defaultLeadDatabaseService) defaultLeadDatabaseService = new LeadDatabaseService();
  return defaultLeadDatabaseService;
}

export function resetLeadDatabaseServiceForTests(): void {
  defaultLeadDatabaseService = undefined;
}
