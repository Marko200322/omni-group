/**
 * Official Ads adapters — LIVE only when credentials + MARKETING_ADS_LIVE_SYNC=true.
 * Never invent spend. Fail-soft on API errors.
 */
export type AdapterSyncResult = {
  adapter: string;
  kind: 'ACTUAL' | 'UNAVAILABLE';
  status: 'success' | 'unavailable' | 'failed';
  message: string;
  rows?: Array<{
    channelCode: string;
    amountCents: number;
    spentOn: string;
    impressions?: number;
    clicks?: number;
    platformConversions?: number;
    campaignExternalId?: string;
    campaignName?: string;
    packageSku?: string;
    idempotencyKey: string;
  }>;
};

export interface MarketingSpendAdapter {
  name: string;
  sync(): Promise<AdapterSyncResult>;
}

function envPresent(key: string): boolean {
  const v = process.env[key]?.trim();
  return Boolean(v && v !== 'placeholder' && !v.startsWith('your_'));
}

function liveSyncEnabled(): boolean {
  const v = process.env.MARKETING_ADS_LIVE_SYNC?.trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'yes';
}

export class ManualCsvAdapter implements MarketingSpendAdapter {
  name = 'manual_csv';
  constructor(private readonly csvText: string) {}

  async sync(): Promise<AdapterSyncResult> {
    const lines = this.csvText
      .trim()
      .split(/\r?\n/)
      .filter((l) => l.trim() && !l.toLowerCase().startsWith('channel'));
    const rows = [];
    for (const line of lines) {
      const [channelCode, amountEur, spentOn, impressions, clicks, conversions] = line
        .split(',')
        .map((s) => s.trim());
      const amount = Math.round(parseFloat(amountEur || '0') * 100);
      if (!channelCode || !Number.isFinite(amount)) continue;
      rows.push({
        channelCode,
        amountCents: amount,
        spentOn: spentOn || new Date().toISOString().slice(0, 10),
        impressions: impressions ? parseInt(impressions, 10) : undefined,
        clicks: clicks ? parseInt(clicks, 10) : undefined,
        platformConversions: conversions ? parseInt(conversions, 10) : undefined,
        idempotencyKey: `csv:${channelCode}:${spentOn}:${amount}`,
      });
    }
    return {
      adapter: this.name,
      kind: 'ACTUAL',
      status: 'success',
      message: `Parsed ${rows.length} rows`,
      rows,
    };
  }
}

async function googleAccessToken(): Promise<string> {
  const clientId = process.env.GOOGLE_ADS_CLIENT_ID!.trim();
  const clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET!.trim();
  const refreshToken = process.env.GOOGLE_ADS_REFRESH_TOKEN!.trim();
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  if (!res.ok) {
    throw new Error(`google_oauth_${res.status}`);
  }
  const json = (await res.json()) as { access_token?: string };
  if (!json.access_token) throw new Error('google_oauth_no_token');
  return json.access_token;
}

export class GoogleAdsAdapter implements MarketingSpendAdapter {
  name = 'google_ads';

  async sync(): Promise<AdapterSyncResult> {
    const creds =
      envPresent('GOOGLE_ADS_DEVELOPER_TOKEN') &&
      envPresent('GOOGLE_ADS_CLIENT_ID') &&
      envPresent('GOOGLE_ADS_CLIENT_SECRET') &&
      envPresent('GOOGLE_ADS_REFRESH_TOKEN') &&
      envPresent('GOOGLE_ADS_CUSTOMER_ID');

    if (!creds) {
      return {
        adapter: this.name,
        kind: 'UNAVAILABLE',
        status: 'unavailable',
        message:
          'GOOGLE_ADS_* incomplete (need DEVELOPER_TOKEN, CLIENT_ID, CLIENT_SECRET, REFRESH_TOKEN, CUSTOMER_ID)',
      };
    }
    if (!liveSyncEnabled()) {
      return {
        adapter: this.name,
        kind: 'UNAVAILABLE',
        status: 'unavailable',
        message: 'Credentials present — set MARKETING_ADS_LIVE_SYNC=true to enable LIVE Google Ads pull',
      };
    }

    try {
      const token = await googleAccessToken();
      const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID!.replace(/-/g, '').trim();
      const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN!.trim();
      const loginCustomerId = process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID?.replace(/-/g, '').trim();

      const query = `
        SELECT
          campaign.id,
          campaign.name,
          segments.date,
          metrics.cost_micros,
          metrics.impressions,
          metrics.clicks,
          metrics.conversions
        FROM campaign
        WHERE segments.date DURING LAST_7_DAYS
      `;

      const headers: Record<string, string> = {
        Authorization: `Bearer ${token}`,
        'developer-token': developerToken,
        'Content-Type': 'application/json',
      };
      if (loginCustomerId) headers['login-customer-id'] = loginCustomerId;

      const res = await fetch(
        `https://googleads.googleapis.com/v17/customers/${customerId}/googleAds:search`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({ query }),
        }
      );
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        return {
          adapter: this.name,
          kind: 'UNAVAILABLE',
          status: 'failed',
          message: `Google Ads API ${res.status}: ${body.slice(0, 180)}`,
        };
      }

      const json = (await res.json()) as {
        results?: Array<{
          campaign?: { id?: string; name?: string };
          segments?: { date?: string };
          metrics?: {
            costMicros?: string;
            impressions?: string;
            clicks?: string;
            conversions?: number;
          };
        }>;
      };

      const rows = (json.results ?? []).map((r) => {
        const micros = Number(r.metrics?.costMicros ?? 0);
        const amountCents = Math.round(micros / 10_000); // micros → cents (1e6 micros = 1 currency unit)
        const spentOn = r.segments?.date ?? new Date().toISOString().slice(0, 10);
        const campaignId = String(r.campaign?.id ?? 'unknown');
        return {
          channelCode: 'google_ads',
          amountCents,
          spentOn,
          impressions: Number(r.metrics?.impressions ?? 0) || undefined,
          clicks: Number(r.metrics?.clicks ?? 0) || undefined,
          platformConversions: Number(r.metrics?.conversions ?? 0) || undefined,
          campaignExternalId: campaignId,
          campaignName: r.campaign?.name,
          idempotencyKey: `google:${customerId}:${campaignId}:${spentOn}:${amountCents}`,
        };
      });

      return {
        adapter: this.name,
        kind: 'ACTUAL',
        status: 'success',
        message: `Google Ads LIVE: ${rows.length} campaign-day rows (LAST_7_DAYS)`,
        rows,
      };
    } catch (err) {
      return {
        adapter: this.name,
        kind: 'UNAVAILABLE',
        status: 'failed',
        message: err instanceof Error ? err.message.slice(0, 200) : 'google_ads_sync_failed',
      };
    }
  }
}

export class MetaAdsAdapter implements MarketingSpendAdapter {
  name = 'meta_ads';

  async sync(): Promise<AdapterSyncResult> {
    if (!envPresent('META_ADS_ACCESS_TOKEN') || !envPresent('META_ADS_AD_ACCOUNT_ID')) {
      return {
        adapter: this.name,
        kind: 'UNAVAILABLE',
        status: 'unavailable',
        message: 'META_ADS_ACCESS_TOKEN and META_ADS_AD_ACCOUNT_ID required',
      };
    }
    if (!liveSyncEnabled()) {
      return {
        adapter: this.name,
        kind: 'UNAVAILABLE',
        status: 'unavailable',
        message: 'Credentials present — set MARKETING_ADS_LIVE_SYNC=true to enable LIVE Meta Ads pull',
      };
    }

    try {
      const token = process.env.META_ADS_ACCESS_TOKEN!.trim();
      let actId = process.env.META_ADS_AD_ACCOUNT_ID!.trim();
      if (!actId.startsWith('act_')) actId = `act_${actId}`;

      const since = new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10);
      const until = new Date().toISOString().slice(0, 10);
      const fields = 'campaign_id,campaign_name,spend,impressions,clicks,actions,date_start';
      const url =
        `https://graph.facebook.com/v21.0/${actId}/insights` +
        `?level=campaign&time_increment=1&fields=${encodeURIComponent(fields)}` +
        `&time_range=${encodeURIComponent(JSON.stringify({ since, until }))}` +
        `&access_token=${encodeURIComponent(token)}`;

      const res = await fetch(url);
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        return {
          adapter: this.name,
          kind: 'UNAVAILABLE',
          status: 'failed',
          message: `Meta Ads API ${res.status}: ${body.slice(0, 180)}`,
        };
      }

      const json = (await res.json()) as {
        data?: Array<{
          campaign_id?: string;
          campaign_name?: string;
          spend?: string;
          impressions?: string;
          clicks?: string;
          date_start?: string;
          actions?: Array<{ action_type?: string; value?: string }>;
        }>;
      };

      const rows = (json.data ?? []).map((r) => {
        const spendEur = parseFloat(r.spend ?? '0');
        const amountCents = Math.round((Number.isFinite(spendEur) ? spendEur : 0) * 100);
        const spentOn = r.date_start ?? until;
        const campaignId = String(r.campaign_id ?? 'unknown');
        const purchase = (r.actions ?? []).find((a) =>
          /purchase|omni|lead/i.test(String(a.action_type ?? ''))
        );
        return {
          channelCode: 'meta_ads',
          amountCents,
          spentOn,
          impressions: Number(r.impressions ?? 0) || undefined,
          clicks: Number(r.clicks ?? 0) || undefined,
          platformConversions: purchase ? Number(purchase.value ?? 0) || undefined : undefined,
          campaignExternalId: campaignId,
          campaignName: r.campaign_name,
          idempotencyKey: `meta:${actId}:${campaignId}:${spentOn}:${amountCents}`,
        };
      });

      return {
        adapter: this.name,
        kind: 'ACTUAL',
        status: 'success',
        message: `Meta Ads LIVE: ${rows.length} campaign-day rows (${since}→${until})`,
        rows,
      };
    } catch (err) {
      return {
        adapter: this.name,
        kind: 'UNAVAILABLE',
        status: 'failed',
        message: err instanceof Error ? err.message.slice(0, 200) : 'meta_ads_sync_failed',
      };
    }
  }
}

/** True when LinkedIn Marketing API spend credentials are present (does not call the API). */
export function linkedInAdsCredentialsPresent(): boolean {
  return envPresent('LINKEDIN_ADS_ACCESS_TOKEN') && envPresent('LINKEDIN_ADS_ACCOUNT_ID');
}

function linkedInDateParts(d: Date): { year: number; month: number; day: number } {
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

function formatLinkedInDateRange(start: Date, end: Date): string {
  const s = linkedInDateParts(start);
  const e = linkedInDateParts(end);
  return `(start:(year:${s.year},month:${s.month},day:${s.day}),end:(year:${e.year},month:${e.month},day:${e.day}))`;
}

function linkedInSpentOn(dateRange?: {
  start?: { year?: number; month?: number; day?: number };
}): string {
  const y = dateRange?.start?.year;
  const m = dateRange?.start?.month;
  const d = dateRange?.start?.day;
  if (y && m && d) {
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }
  return new Date().toISOString().slice(0, 10);
}

/**
 * LinkedIn Marketing API (adAnalytics) — LIVE only with LINKEDIN_ADS_* + MARKETING_ADS_LIVE_SYNC.
 * Never invents spend; fail-soft on API errors. Does not call LinkedIn without credentials + flag.
 */
export class LinkedInAdsAdapter implements MarketingSpendAdapter {
  name = 'linkedin';

  async sync(): Promise<AdapterSyncResult> {
    if (!linkedInAdsCredentialsPresent()) {
      return {
        adapter: this.name,
        kind: 'UNAVAILABLE',
        status: 'unavailable',
        message: 'LINKEDIN_ADS_* incomplete (need ACCESS_TOKEN, ACCOUNT_ID)',
      };
    }
    if (!liveSyncEnabled()) {
      return {
        adapter: this.name,
        kind: 'UNAVAILABLE',
        status: 'unavailable',
        message:
          'Credentials present — set MARKETING_ADS_LIVE_SYNC=true to enable LIVE LinkedIn Ads pull',
      };
    }

    try {
      const token = process.env.LINKEDIN_ADS_ACCESS_TOKEN!.trim();
      const rawAccount = process.env.LINKEDIN_ADS_ACCOUNT_ID!.trim();
      const numericId = rawAccount.replace(/^urn:li:sponsoredAccount:/i, '');
      const accountUrn = `urn:li:sponsoredAccount:${numericId}`;

      const until = new Date();
      const since = new Date(Date.now() - 7 * 864e5);
      const dateRange = formatLinkedInDateRange(since, until);
      // Rest.li List(): encode URN only; keep List(...) wrapper literal.
      const accountsParam = `List(${encodeURIComponent(accountUrn)})`;
      const url =
        `https://api.linkedin.com/rest/adAnalytics` +
        `?q=analytics` +
        `&pivot=CAMPAIGN` +
        `&timeGranularity=DAILY` +
        `&dateRange=${encodeURIComponent(dateRange)}` +
        `&accounts=${accountsParam}` +
        `&fields=impressions,clicks,costInLocalCurrency,pivotValues,dateRange`;

      const version =
        process.env.LINKEDIN_ADS_API_VERSION?.trim() || '202401';
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          'LinkedIn-Version': version,
          'X-Restli-Protocol-Version': '2.0.0',
        },
      });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        return {
          adapter: this.name,
          kind: 'UNAVAILABLE',
          status: 'failed',
          message: `LinkedIn Ads API ${res.status}: ${body.slice(0, 180)}`,
        };
      }

      const json = (await res.json()) as {
        elements?: Array<{
          costInLocalCurrency?: string | number;
          impressions?: number | string;
          clicks?: number | string;
          pivotValues?: string[];
          dateRange?: {
            start?: { year?: number; month?: number; day?: number };
          };
        }>;
      };

      const rows = (json.elements ?? []).map((r) => {
        const spend = parseFloat(String(r.costInLocalCurrency ?? '0'));
        const amountCents = Math.round((Number.isFinite(spend) ? spend : 0) * 100);
        const spentOn = linkedInSpentOn(r.dateRange);
        const campaignUrn = String(r.pivotValues?.[0] ?? 'unknown');
        const campaignId = campaignUrn.replace(/^urn:li:sponsoredCampaign:/i, '') || campaignUrn;
        return {
          channelCode: 'linkedin',
          amountCents,
          spentOn,
          impressions: Number(r.impressions ?? 0) || undefined,
          clicks: Number(r.clicks ?? 0) || undefined,
          campaignExternalId: campaignId,
          campaignName: campaignUrn.startsWith('urn:') ? undefined : campaignUrn,
          idempotencyKey: `linkedin:${numericId}:${campaignId}:${spentOn}:${amountCents}`,
        };
      });

      return {
        adapter: this.name,
        kind: 'ACTUAL',
        status: 'success',
        message: `LinkedIn Ads LIVE: ${rows.length} campaign-day rows (LAST_7_DAYS)`,
        rows,
      };
    } catch (err) {
      return {
        adapter: this.name,
        kind: 'UNAVAILABLE',
        status: 'failed',
        message: err instanceof Error ? err.message.slice(0, 200) : 'linkedin_ads_sync_failed',
      };
    }
  }
}

export function defaultAdapters(): MarketingSpendAdapter[] {
  return [new GoogleAdsAdapter(), new MetaAdsAdapter(), new LinkedInAdsAdapter()];
}
