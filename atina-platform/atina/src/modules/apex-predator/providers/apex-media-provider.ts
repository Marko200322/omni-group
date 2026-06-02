export type ApexMediaProviderId = 'flux' | 'live_portrait';

export type ApexMediaProviderStatus = {
  id: ApexMediaProviderId;
  configured: boolean;
  message: string;
};

export interface ApexMediaProvider {
  readonly id: ApexMediaProviderId;
  isConfigured(): boolean;
  status(): ApexMediaProviderStatus;
  /** Optional generation hook when credentials are present. */
  generate?(payload: Record<string, unknown>): Promise<Record<string, unknown> | null>;
}
