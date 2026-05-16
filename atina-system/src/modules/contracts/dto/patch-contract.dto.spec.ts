import { validate } from 'class-validator';
import { PatchContractDto } from './patch-contract.dto';

describe('PatchContractDto', () => {
  const validUserId = 'a1b2c3d4-e5f6-47a8-9b0c-1d2e3f4a5b6c';

  it('accepts empty object (all fields optional)', async () => {
    const dto = Object.assign(new PatchContractDto(), {});
    expect(await validate(dto)).toHaveLength(0);
  });

  it('accepts partial userId only', async () => {
    const dto = Object.assign(new PatchContractDto(), { userId: validUserId });
    expect(await validate(dto)).toHaveLength(0);
  });

  it('accepts status and value without userId', async () => {
    const dto = Object.assign(new PatchContractDto(), {
      status: 'ACTIVE',
      value: '0',
    });
    expect(await validate(dto)).toHaveLength(0);
  });

  it('rejects invalid optional userId', async () => {
    const dto = Object.assign(new PatchContractDto(), { userId: 'bad' });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === 'userId')).toBe(true);
  });

  it('rejects non-numberString value', async () => {
    const dto = Object.assign(new PatchContractDto(), { value: 'x' });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === 'value')).toBe(true);
  });
});
