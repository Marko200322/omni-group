import type { AutonomyLevel, OperatingMode } from './constants';
import type { RiskLevel } from './risk-engine';

export type FinancialSnapshot = {
  asOf: string;
  currency: string;
  cashCents: number;
  operatingCents: number;
  marketingCents: number;
  profitReserveCents: number;
  taxReserveCents: number;
  systemCents: number;
  monthlyRevenueCents: number;
  monthlyExpenseCents: number;
  monthlyNetCents: number;
  runwayMonths: number;
  operatingMode: OperatingMode;
  kind: 'ACTUAL' | 'ESTIMATE';
};

export type OpportunityDraft = {
  id: string;
  title: string;
  demandCodes: string[];
  estimatedInitialCostCents: number;
  estimatedMonthlyCostCents: number;
  estimatedMonthlyRevenueCents: number;
  priorityScore: number;
  why: string;
  confidence: number;
  status: 'draft' | 'scored' | 'approved' | 'rejected' | 'deferred';
  createdAt: string;
  /** ROI figures are non-guaranteed scenarios only. */
  roiKind: 'non_guaranteed';
};

export type EngineStatus = {
  engineVersion: string;
  scoringVersion: string;
  policyVersion: string;
  killSwitch: boolean;
  dryRunDefault: boolean;
  autonomyLevel: AutonomyLevel;
  operatingMode: OperatingMode;
  lastRiskLevel: RiskLevel | null;
  healthy: boolean;
  message: string;
  checkedAt: string;
};
