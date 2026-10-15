import { describe, it, expect, beforeEach } from 'vitest';
import { meiliText, setTransport } from './client';

describe('meiliText', () => {
  beforeEach(() => {
    setTransport(async () => ({ status: 200, body: '' }));
  });

  it('returns prometheus body without JSON parse', async () => {
    setTransport(async () => ({
      status: 200,
      body: '# TYPE meilisearch_is_indexing gauge\nmeilisearch_is_indexing 1\n'
    }));
    await expect(meiliText('GET', '/metrics')).resolves.toContain('meilisearch_is_indexing 1');
  });

  it('throws MeiliError on feature_not_enabled', async () => {
    setTransport(async () => ({
      status: 400,
      body: JSON.stringify({
        message: 'Getting metrics requires enabling the metrics experimental feature.',
        code: 'feature_not_enabled',
        type: 'invalid_request',
        link: ''
      })
    }));
    await expect(meiliText('GET', '/metrics')).rejects.toMatchObject({ code: 'feature_not_enabled' });
  });
});
