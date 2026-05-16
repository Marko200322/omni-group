import { renderTemplate } from '../../../../modules/template-engine/service/template-render.service';

describe('renderTemplate', () => {
  it('substitutes {{key}} with string values', () => {
    expect(renderTemplate('Hello {{name}}', { name: 'Ada' })).toBe('Hello Ada');
  });

  it('leaves unknown placeholders unchanged', () => {
    expect(renderTemplate('{{a}} {{missing}}', { a: '1' })).toBe('1 {{missing}}');
  });

  it('replaces repeated keys', () => {
    expect(renderTemplate('{{x}}-{{x}}', { x: 'y' })).toBe('y-y');
  });

  it('only matches simple identifiers (no dots or spaces inside braces)', () => {
    expect(renderTemplate('{{a.b}}', { 'a.b': 'yes' })).toBe('{{a.b}}');
    expect(renderTemplate('{{ a }}', { a: 'spaced' })).toBe('{{ a }}');
  });

  it('uses string values only (no coercion)', () => {
    expect(renderTemplate('n={{n}}', { n: '3' })).toBe('n=3');
  });

  it('handles empty string values', () => {
    expect(renderTemplate('{{a}}{{b}}', { a: '', b: '' })).toBe('');
  });

  it('ignores invalid identifier placeholders', () => {
    expect(renderTemplate('{{9bad}}', {})).toBe('{{9bad}}');
  });

  it('handles empty template', () => {
    expect(renderTemplate('', { a: 'x' })).toBe('');
  });

  it('does not substitute keys only on prototype chain', () => {
    const variables = Object.create({ protoOnly: 'leak' });
    expect(renderTemplate('{{protoOnly}}', variables)).toBe('{{protoOnly}}');
  });

  it('replaces own keys when object has inherited props with same name shadowed', () => {
    const variables = Object.assign(Object.create({ x: 'bad' }), { x: 'good' });
    expect(renderTemplate('{{x}}', variables)).toBe('good');
  });

  it('leaves unknown keys adjacent to known keys', () => {
    expect(renderTemplate('{{a}}{{-bad}}', { a: '1' })).toBe('1{{-bad}}');
  });

  it('substitutes snake_case identifiers', () => {
    expect(renderTemplate('{{user_name}}-{{user_id}}', { user_name: 'Ada', user_id: '42' })).toBe('Ada-42');
  });
});
