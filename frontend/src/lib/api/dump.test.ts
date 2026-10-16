import { describe, expect, it } from 'vitest';
import type { Settings } from './types';
import { documentBatches, dumpFileName, parseDump, settingsForRestore } from './dump';

const settings = (): Settings =>
  ({
    displayedAttributes: ['*'],
    embedders: { main: { source: 'openAi', apiKey: 'secret-key', model: 'small' } }
  }) as Settings;

describe('dump file', () => {
  it('drops embedder apiKey so restore does not write a redacted key', () => {
    const next = settingsForRestore(settings());
    expect(next.embedders?.main).toEqual({ source: 'openAi', model: 'small' });
    expect((settings().embedders?.main as { apiKey: string }).apiKey).toBe('secret-key');
  });

  it('parses a dump and rejects anything else', () => {
    const dump = parseDump(
      JSON.stringify({
        meilipilot: 1,
        kind: 'index',
        dumpedAt: '2026-10-16T10:00:00.000Z',
        indexes: [{ uid: 'movies', primaryKey: 'id', settings: settings(), documents: [{ id: 1 }] }]
      })
    );
    expect(dump.indexes[0].uid).toBe('movies');
    expect(dump.indexes[0].documents).toEqual([{ id: 1 }]);
    expect(() => parseDump('[]')).toThrow(/dump/i);
    expect(() => parseDump('{"meilipilot":2,"indexes":[]}')).toThrow(/MeiliPilot/);
  });

  it('splits documents into batches and names the file from the index', () => {
    expect(documentBatches([1, 2, 3, 4], 2)).toEqual([[1, 2], [3, 4]]);
    expect(
      dumpFileName({
        meilipilot: 1,
        kind: 'index',
        dumpedAt: '2026-10-16T10:11:12.000Z',
        indexes: [{ uid: 'movies', primaryKey: null, settings: settings(), documents: [] }]
      })
    ).toBe('movies-2026-10-16-10-11-12.json');
  });
});
