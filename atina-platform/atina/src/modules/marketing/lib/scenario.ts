/** What-if simulator — always labeled FORECAST / SCENARIO. Never guaranteed. */
import { computeChannelEconomics, type ChannelEconomicsInput } from './economics';

export type ScenarioInput = ChannelEconomicsInput & {
  spendMultiplier?: number;
  leadMultiplier?: number;
  qualifiedMultiplier?: number;
  customerMultiplier?: number;
  cacIncreasePct?: number;
  conversionFallPct?: number;
};

export type ScenarioResult = {
  kind: 'SCENARIO';
  label: 'FORECAST / SCENARIO';
  disclaimer: string;
  baseline: ReturnType<typeof computeChannelEconomics>;
  scenario: ReturnType<typeof computeChannelEconomics>;
  deltas: {
    spend: number;
    leads: number;
    customers: number;
    revenue: number;
    contribution: number;
  };
};

export function runWhatIf(input: ScenarioInput): ScenarioResult {
  const baseline = computeChannelEconomics(input);
  const spendMult = input.spendMultiplier ?? 1;
  const leadMult = input.leadMultiplier ?? 1;
  const qualMult = input.qualifiedMultiplier ?? leadMult;
  let custMult = input.customerMultiplier ?? leadMult;
  if (input.conversionFallPct && input.conversionFallPct > 0) {
    custMult *= 1 - input.conversionFallPct / 100;
  }
  let spend = input.spend * spendMult;
  if (input.cacIncreasePct && input.cacIncreasePct > 0 && custMult > 0) {
    // Higher CAC with same customers implies more spend needed — reflective only
    spend *= 1 + input.cacIncreasePct / 100;
  }

  const scenarioInput: ChannelEconomicsInput = {
    ...input,
    spend,
    leads: input.leads * leadMult,
    qualifiedLeads: input.qualifiedLeads * qualMult,
    customers: input.customers * custMult,
    revenue: input.revenue * custMult,
    opportunities: input.opportunities * leadMult,
    offers: input.offers * custMult,
  };
  const scenario = computeChannelEconomics(scenarioInput);

  return {
    kind: 'SCENARIO',
    label: 'FORECAST / SCENARIO',
    disclaimer: 'Not a guaranteed outcome. Labels FORECAST / SCENARIO only.',
    baseline,
    scenario,
    deltas: {
      spend: scenarioInput.spend - input.spend,
      leads: scenarioInput.leads - input.leads,
      customers: scenarioInput.customers - input.customers,
      revenue: scenarioInput.revenue - input.revenue,
      contribution: scenario.contribution - baseline.contribution,
    },
  };
}
