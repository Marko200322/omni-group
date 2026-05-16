import { Dominus360Module } from '../../modules/dominus360/dominus360.module';

describe('Dominus360Module', () => {
  it('initialize registers routes', async () => {
    const m = new Dominus360Module();
    await m.initialize();
    expect(m.router).toBeDefined();
  });
});
