/**
 * SOFRA Framework + e-Estonia X-Road simulacija obračuna poreza (EU).
 * Deterministički model za audit trag; ne zamenjuje pravni savet ili živi X-Road.
 */
export type SofraTaxInput = {
  grossRevenueEur: number;
  countryCode?: string;
  vatRegistered?: boolean;
};

export type SofraTaxResult = {
  framework: 'SOFRA';
  xRoadSimulated: boolean;
  countryCode: string;
  vatRate: number;
  vatAmountEur: number;
  netRevenueEur: number;
  withholdingEur: number;
  totalTaxEur: number;
  calculatedAt: string;
};

const EU_VAT_DEFAULT: Record<string, number> = {
  EE: 0.22,
  DE: 0.19,
  FR: 0.2,
  RS: 0.2,
  default: 0.21,
};

export function calculateSofraTax(input: SofraTaxInput): SofraTaxResult {
  const gross = Math.max(0, Number(input.grossRevenueEur) || 0);
  const country = (input.countryCode ?? 'EE').toUpperCase().slice(0, 2);
  const vatRate = EU_VAT_DEFAULT[country] ?? EU_VAT_DEFAULT.default;
  const vatAmount = input.vatRegistered === false ? 0 : Math.round(gross * vatRate * 100) / 100;
  const withholding = Math.round(gross * 0.05 * 100) / 100;
  const totalTax = Math.round((vatAmount + withholding) * 100) / 100;
  const net = Math.round((gross - totalTax) * 100) / 100;

  return {
    framework: 'SOFRA',
    xRoadSimulated: true,
    countryCode: country,
    vatRate,
    vatAmountEur: vatAmount,
    netRevenueEur: net,
    withholdingEur: withholding,
    totalTaxEur: totalTax,
    calculatedAt: new Date().toISOString(),
  };
}
