import { describe, expect, it } from 'vitest';
import { inlineRenderBody, renderPreview } from './render-form';

describe('render form', () => {
  it('builds an inline preview body', () => {
    expect(inlineRenderBody('{{ doc.title }}', '{"title":"hi"}')).toEqual({
      template: { kind: 'inlineDocumentTemplate', inline: '{{ doc.title }}' },
      input: { kind: 'inlineDocument', inline: { title: 'hi' } }
    });
  });

  it('reads the rendered string', () => {
    expect(renderPreview({ template: '{{ doc.title }}', rendered: 'hi' })).toEqual({
      template: '{{ doc.title }}',
      rendered: 'hi'
    });
  });
});
