import { describe, expect, it } from 'vitest';
import { networkDraft, networkPatch } from './network-form';

describe('network form', () => {
  it('reads self and remotes from GET /network', () => {
    expect(
      networkDraft({
        self: 'ms-0',
        leader: 'ms-0',
        remotes: { 'ms-1': { url: 'http://10.0.0.2:7700', searchApiKey: 's' } },
        previousRemotes: { old: { url: 'http://gone' } }
      })
    ).toEqual({
      self: 'ms-0',
      leader: 'ms-0',
      remotes: [{ name: 'ms-1', url: 'http://10.0.0.2:7700', searchApiKey: 's', writeApiKey: '' }]
    });
  });

  it('sends null to remove a remote and skips blank api keys', () => {
    expect(
      networkPatch(
        {
          self: 'ms-0',
          leader: '',
          remotes: [{ name: 'ms-1', url: 'http://10.0.0.2:7700', searchApiKey: '', writeApiKey: '' }]
        },
        ['ms-2']
      )
    ).toEqual({
      self: 'ms-0',
      remotes: {
        'ms-2': null,
        'ms-1': { url: 'http://10.0.0.2:7700' }
      }
    });
  });
});
