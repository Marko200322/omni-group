import { ProxyRotationModule } from '../../modules/proxy-rotation/proxy-rotation.module';

describe('ProxyRotationModule', () => {
  it('initialize registers routes', async () => {
    const m = new ProxyRotationModule();
    await m.initialize();
    expect(m.router).toBeDefined();
  });
});
