export function inlineRenderBody(template: string, documentText: string) {
  const inline = template.trim();
  if (!inline) throw new Error('Nhập template');
  let document: unknown = {};
  const text = documentText.trim();
  if (text) {
    document = JSON.parse(text);
    if (!document || typeof document !== 'object' || Array.isArray(document)) {
      throw new Error('Document phải là JSON object');
    }
  }
  return {
    template: { kind: 'inlineDocumentTemplate' as const, inline },
    input: { kind: 'inlineDocument' as const, inline: document }
  };
}

export function renderPreview(raw: unknown): { template: string; rendered: string } {
  const body = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const template = body.template == null ? '' : typeof body.template === 'string' ? body.template : JSON.stringify(body.template, null, 2);
  const rendered = body.rendered == null ? '' : typeof body.rendered === 'string' ? body.rendered : JSON.stringify(body.rendered, null, 2);
  return { template, rendered };
}
