import { ValidatorModule } from '../../modules/validator/validator.module';

describe('ValidatorModule', () => {
  it('initialize registers routes', async () => {
    const m = new ValidatorModule();
    await m.initialize();
    expect(m.router).toBeDefined();
  });
});
