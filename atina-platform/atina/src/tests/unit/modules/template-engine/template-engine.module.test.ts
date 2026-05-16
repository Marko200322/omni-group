import { TemplateEngineModule } from '../../../../modules/template-engine/template-engine.module';

describe('TemplateEngineModule', () => {
  it('initialize registers routes', async () => {
    const m = new TemplateEngineModule();
    await m.initialize();
    expect(m.router).toBeDefined();
  });
});
