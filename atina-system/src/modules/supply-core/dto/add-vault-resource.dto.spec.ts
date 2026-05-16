import { validate } from 'class-validator';
import { AddVaultResourceDto } from './add-vault-resource.dto';

describe('AddVaultResourceDto', () => {
  it('accepts minimal valid body', async () => {
    const dto = Object.assign(new AddVaultResourceDto(), {
      provider: 'aws',
      resourceType: 'queue',
      label: 'q1',
    });
    expect(await validate(dto)).toHaveLength(0);
  });

  it('accepts body without label (Vault allows null)', async () => {
    const dto = Object.assign(new AddVaultResourceDto(), {
      provider: 'aws',
      resourceType: 'queue',
    });
    expect(await validate(dto)).toHaveLength(0);
  });

  it('accepts explicit null label', async () => {
    const dto = Object.assign(new AddVaultResourceDto(), {
      provider: 'aws',
      resourceType: 'queue',
      label: null,
    });
    expect(await validate(dto)).toHaveLength(0);
  });

  it('accepts optional payload object', async () => {
    const dto = Object.assign(new AddVaultResourceDto(), {
      provider: 'aws',
      resourceType: 'queue',
      label: 'q1',
      payload: { a: 1 },
    });
    expect(await validate(dto)).toHaveLength(0);
  });

  it('rejects when payload is not a plain object', async () => {
    const dto = Object.assign(new AddVaultResourceDto(), {
      provider: 'aws',
      resourceType: 'queue',
      label: 'q1',
      payload: 'not-an-object',
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});
