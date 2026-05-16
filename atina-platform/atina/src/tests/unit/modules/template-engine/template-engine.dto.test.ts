import { RenderTemplateDto } from '../../../../modules/template-engine/dto/template-engine.dto';
import { TEMPLATE_ENGINE_MAX_TEMPLATE_LENGTH } from '../../../../modules/template-engine/template-engine.constants';

describe('Template engine DTOs', () => {
  it('accepts template and string variables map', () => {
    const r = RenderTemplateDto.safeParse({
      template: 'Hello {{name}}',
      variables: { name: 'Ada' },
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.template).toBe('Hello {{name}}');
      expect(r.data.variables).toEqual({ name: 'Ada' });
    }
  });

  it('defaults variables to empty object when omitted', () => {
    const r = RenderTemplateDto.safeParse({ template: 'plain' });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.variables).toEqual({});
  });

  it('rejects template longer than max length', () => {
    const r = RenderTemplateDto.safeParse({
      template: 'x'.repeat(TEMPLATE_ENGINE_MAX_TEMPLATE_LENGTH + 1),
      variables: {},
    });
    expect(r.success).toBe(false);
  });

  it('accepts template at exactly max length', () => {
    const r = RenderTemplateDto.safeParse({
      template: 'y'.repeat(TEMPLATE_ENGINE_MAX_TEMPLATE_LENGTH),
    });
    expect(r.success).toBe(true);
  });

  it('rejects non-string variable values', () => {
    expect(
      RenderTemplateDto.safeParse({
        template: 't',
        variables: { n: 1 as unknown as string },
      }).success
    ).toBe(false);
  });
});
