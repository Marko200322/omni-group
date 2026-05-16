import {
  ApexPredatorRunParamsDto,
  CreateApexPredatorDto,
  RunApexPredatorDto,
} from '../../../../modules/apex-predator/dto/apex-predator.dto';

describe('Apex Predator DTOs', () => {
  it('CreateApexPredatorDto applies defaults and accepts risk profiles', () => {
    const r = CreateApexPredatorDto.safeParse({ name: 'OK' });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.budgetAllocated).toBe(0);
      expect(r.data.riskProfile).toBe('medium');
    }
    for (const riskProfile of ['low', 'medium', 'high'] as const) {
      const p = CreateApexPredatorDto.safeParse({ name: 'Ab', budgetAllocated: 1, riskProfile });
      expect(p.success).toBe(true);
      if (p.success) expect(p.data.riskProfile).toBe(riskProfile);
    }
  });

  it('CreateApexPredatorDto rejects short name and invalid risk', () => {
    expect(CreateApexPredatorDto.safeParse({ name: 'A' }).success).toBe(false);
    expect(CreateApexPredatorDto.safeParse({ name: 'Good', riskProfile: 'extreme' }).success).toBe(false);
    expect(CreateApexPredatorDto.safeParse({ name: 'Good', extra: 1 }).success).toBe(false);
  });

  it('RunApexPredatorDto applies defaults and accepts modes', () => {
    const d = RunApexPredatorDto.safeParse({});
    expect(d.success).toBe(true);
    if (d.success) {
      expect(d.data.mode).toBe('outreach');
      expect(d.data.intensity).toBe(30);
    }
    for (const mode of ['outreach', 'upsell', 'retention', 'risk-shield'] as const) {
      const p = RunApexPredatorDto.safeParse({ mode, intensity: 50 });
      expect(p.success).toBe(true);
      if (p.success) expect(p.data.mode).toBe(mode);
    }
  });

  it('RunApexPredatorDto rejects intensity out of range', () => {
    expect(RunApexPredatorDto.safeParse({ intensity: 0 }).success).toBe(false);
    expect(RunApexPredatorDto.safeParse({ intensity: 101 }).success).toBe(false);
  });

  it('ApexPredatorRunParamsDto validates id pattern', () => {
    expect(ApexPredatorRunParamsDto.safeParse({ id: 'valid-id_01' }).success).toBe(true);
    expect(ApexPredatorRunParamsDto.safeParse({ id: 'bad id!' }).success).toBe(false);
    expect(ApexPredatorRunParamsDto.safeParse({ id: 'x' }).success).toBe(false);
  });
});
