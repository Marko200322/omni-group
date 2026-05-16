import { validate } from 'class-validator';
import { CreateContractDto } from './create-contract.dto';

describe('CreateContractDto', () => {
  const validUserId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';

  it('accepts minimal body (userId only)', async () => {
    const dto = Object.assign(new CreateContractDto(), { userId: validUserId });
    expect(await validate(dto)).toHaveLength(0);
  });

  it('accepts optional status and value', async () => {
    const dto = Object.assign(new CreateContractDto(), {
      userId: validUserId,
      status: 'SIGNED',
      value: '99.50',
    });
    expect(await validate(dto)).toHaveLength(0);
  });

  it('rejects invalid userId', async () => {
    const dto = Object.assign(new CreateContractDto(), { userId: 'not-a-uuid' });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === 'userId')).toBe(true);
  });

  it('rejects value that is not a number string', async () => {
    const dto = Object.assign(new CreateContractDto(), {
      userId: validUserId,
      value: 'abc',
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === 'value')).toBe(true);
  });
});
