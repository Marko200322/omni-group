import {
  APEX_CONTENT_TIERS_EUR,
} from '../../modules/apex-predator/service/apex-predator.service';

describe('Apex Content Tier bands', () => {
  it('defines four tiers from 10 to 1000 EUR', () => {
    expect(APEX_CONTENT_TIERS_EUR).toHaveLength(4);
    expect(APEX_CONTENT_TIERS_EUR[0].minEur).toBe(10);
    expect(APEX_CONTENT_TIERS_EUR[3].maxEur).toBe(1000);
  });
});
