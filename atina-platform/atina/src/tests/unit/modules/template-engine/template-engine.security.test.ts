import { renderTemplate } from '../../../../modules/template-engine/service/template-render.service';

describe('template-engine security (no eval, literal substitution)', () => {
  let evalSpy: jest.SpyInstance;
  let functionSpy: jest.SpyInstance;

  beforeEach(() => {
    evalSpy = jest.spyOn(globalThis as unknown as { eval: typeof eval }, 'eval');
    functionSpy = jest.spyOn(globalThis as unknown as { Function: typeof Function }, 'Function');
  });

  afterEach(() => {
    evalSpy.mockRestore();
    functionSpy.mockRestore();
  });

  it('does not invoke eval or Function when rendering', () => {
    renderTemplate('{{x}}', { x: "1 + 1; globalThis.__ex = eval('1')" });
    expect(evalSpy).not.toHaveBeenCalled();
    expect(functionSpy).not.toHaveBeenCalled();
  });

  it('embeds script/HTML payloads as literal text (no server-side execution)', () => {
    const malicious = '<script>alert(1)</script>';
    const out = renderTemplate('body={{html}}', { html: malicious });
    expect(out).toBe(`body=${malicious}`);
    expect(out).toContain('<script>');
  });

  it('does not treat template body as code', () => {
    const out = renderTemplate('{{payload}}', { payload: '${7*7}' });
    expect(out).toBe('${7*7}');
  });

  it('does not read inherited keys from variables (prototype pollution surface)', () => {
    const variables = Object.create({ constructor: 'evil', __proto__: 'x' });
    expect(renderTemplate('{{constructor}}', variables)).toBe('{{constructor}}');
  });
});
