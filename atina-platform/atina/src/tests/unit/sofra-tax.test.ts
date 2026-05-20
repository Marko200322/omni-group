import { calculateSofraTax } from '../../utils/sofra-tax';

describe('calculateSofraTax', () => {
  it('applies default EE VAT and withholding', () => {
    const result = calculateSofraTax({ grossRevenueEur: 100 });
    expect(result.countryCode).toBe('EE');
    expect(result.vatAmountEur).toBe(22);
    expect(result.withholdingEur).toBe(5);
    expect(result.totalTaxEur).toBe(27);
    expect(result.netRevenueEur).toBe(73);
    expect(result.xRoadSimulated).toBe(true);
  });

  it('skips VAT when not registered', () => {
    const result = calculateSofraTax({ grossRevenueEur: 200, vatRegistered: false });
    expect(result.vatAmountEur).toBe(0);
    expect(result.totalTaxEur).toBe(10);
  });

  it('uses country-specific VAT rate and clamps negative gross', () => {
    const de = calculateSofraTax({ grossRevenueEur: 100, countryCode: 'DE' });
    expect(de.vatRate).toBe(0.19);
    const unknown = calculateSofraTax({ grossRevenueEur: -5, countryCode: 'ZZ' });
    expect(unknown.vatRate).toBe(0.21);
    expect(unknown.netRevenueEur).toBe(0);
  });

  it('treats NaN gross as zero', () => {
    const result = calculateSofraTax({ grossRevenueEur: Number.NaN });
    expect(result.netRevenueEur).toBe(0);
    expect(result.totalTaxEur).toBe(0);
  });
});
