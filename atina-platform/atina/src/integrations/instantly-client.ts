import { config } from '../config';
import logger from '../utils/logger';

export type InstantlyLeadInput = {
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  companyName?: string | null;
  jobTitle?: string | null;
  personalization?: string | null;
  customVariables?: Record<string, string | number | boolean | null>;
};

export type InstantlyBulkAddResult = {
  created: number;
  skipped: number;
  raw: Record<string, unknown>;
};

export class InstantlyClient {
  isConfigured(): boolean {
    return Boolean(config.instantly.apiKey.trim() && config.instantly.campaignId.trim());
  }

  private headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${config.instantly.apiKey.trim()}`,
      'Content-Type': 'application/json',
    };
  }

  private baseUrl(): string {
    return config.instantly.baseUrl.replace(/\/+$/, '');
  }

  /** Push leads into an Instantly campaign — Instantly sends from warmed mailboxes. */
  async addLeadsToCampaign(leads: InstantlyLeadInput[]): Promise<InstantlyBulkAddResult> {
    if (!this.isConfigured()) {
      throw new Error('instantly_not_configured');
    }
    if (leads.length === 0) {
      return { created: 0, skipped: 0, raw: {} };
    }

    const payload = {
      campaign_id: config.instantly.campaignId.trim(),
      skip_if_in_campaign: true,
      skip_if_in_list: true,
      verify_leads_on_import: false,
      leads: leads.map((lead) => ({
        email: lead.email.trim(),
        first_name: lead.firstName?.trim() || null,
        last_name: lead.lastName?.trim() || null,
        company_name: lead.companyName?.trim() || null,
        job_title: lead.jobTitle?.trim() || null,
        personalization: lead.personalization?.trim() || null,
        custom_variables: lead.customVariables ?? undefined,
      })),
    };

    const res = await fetch(`${this.baseUrl()}/api/v2/leads/add`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(payload),
    });

    const raw = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      const detail =
        typeof raw.message === 'string'
          ? raw.message
          : typeof raw.error === 'string'
            ? raw.error
            : `Instantly API ${res.status}`;
      logger.warn('Instantly lead import failed', { status: res.status, detail });
      throw new Error(detail);
    }

    const created =
      typeof raw.created_leads === 'number'
        ? raw.created_leads
        : typeof raw.uploaded === 'number'
          ? raw.uploaded
          : leads.length;
    const skipped =
      typeof raw.duplicated_leads === 'number'
        ? raw.duplicated_leads
        : typeof raw.skipped === 'number'
          ? raw.skipped
          : 0;

    logger.info('Instantly leads queued', { created, skipped, campaignId: config.instantly.campaignId });
    return { created, skipped, raw };
  }
}

let defaultInstantlyClient: InstantlyClient | undefined;

export function getInstantlyClient(override?: InstantlyClient): InstantlyClient {
  if (override) return override;
  if (!defaultInstantlyClient) defaultInstantlyClient = new InstantlyClient();
  return defaultInstantlyClient;
}

export function resetInstantlyClientForTests(): void {
  defaultInstantlyClient = undefined;
}
