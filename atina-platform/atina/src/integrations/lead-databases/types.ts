export type LeadRecord = {
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  title: string | null;
  company: string | null;
  companyDomain: string | null;
  phone: string | null;
  linkedinUrl: string | null;
  provider: string;
  verified: boolean;
  raw?: Record<string, unknown>;
};

export type LeadSearchQuery = {
  keywords?: string;
  companyDomain?: string;
  companyName?: string;
  limit?: number;
};

export type EmailVerifyResult = {
  email: string;
  status: 'valid' | 'invalid' | 'catch_all' | 'unknown' | 'disposable';
  provider: string;
  deliverable: boolean;
};

export type LeadProviderId = 'apollo' | 'hunter' | 'lusha' | 'snov' | 'zoominfo';

export type EmailVerifyProviderId = 'neverbounce' | 'zerobounce';
