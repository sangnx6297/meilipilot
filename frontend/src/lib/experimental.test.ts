import { describe, expect, it } from 'vitest';
import { capabilitiesFrom, flagOn } from './api/capability';
import {
  appendContains,
  bulkExperimentalPatch,
  consumeChatSse,
  consumeNdjson,
  embedderHint,
  featureHint,
  appendForeignKey,
  appendLogChunk,
  compositeEmbedder,
  mediaFromImageFile,
  mediaJsonFromImageUrl,
  mergeEmbedder,
  safeExperimentalEnabled,
  splitDataUrl,
  settingVisible,
  upsertByUid
} from './experimental';

describe('bulkExperimentalPatch', () => {
  it('toggles every flag except the ones that change search or fetch behavior', () => {
    const current = { metrics: false, chatCompletions: true, legacySearch: true, disableDocumentsFetchQueue: false };
    expect(bulkExperimentalPatch(current, true)).toEqual({ metrics: true, chatCompletions: true });
    expect(bulkExperimentalPatch(current, false)).toEqual({ metrics: false, chatCompletions: false });
  });
});

describe('safeExperimentalEnabled', () => {
  it('is on only when every non-risky flag is true', () => {
    expect(safeExperimentalEnabled({ metrics: true, legacySearch: false })).toBe(true);
    expect(safeExperimentalEnabled({ metrics: false, chatCompletions: true })).toBe(false);
    expect(safeExperimentalEnabled({})).toBe(false);
  });
});

describe('flagOn', () => {
  it('is true only when the experimental flag is exactly true', () => {
    const caps = capabilitiesFrom('1.55.0', { multimodal: true, containsFilter: false });
    expect(flagOn(caps, 'multimodal')).toBe(true);
    expect(flagOn(caps, 'containsFilter')).toBe(false);
    expect(flagOn(caps, 'missing')).toBe(false);
  });
});

describe('featureHint', () => {
  it('returns a Vietnamese hint for known flags and empty for unknown keys', () => {
    expect(featureHint('metrics')).toMatch(/metrics/i);
    expect(featureHint('not-a-flag')).toBe('');
  });
});

describe('appendContains', () => {
  it('appends a quoted CONTAINS clause', () => {
    expect(appendContains('', 'title', 'áo thun')).toBe('title CONTAINS "áo thun"');
    expect(appendContains('year > 2000', 'title', 'say "hi"')).toBe(
      'year > 2000 AND title CONTAINS "say \\"hi\\""'
    );
  });

  it('leaves the filter unchanged when attribute or value is blank', () => {
    expect(appendContains('year > 2000', '  ', 'x')).toBe('year > 2000');
    expect(appendContains('year > 2000', 'title', '   ')).toBe('year > 2000');
  });
});

describe('consumeNdjson', () => {
  it('keeps a partial line and returns complete JSON lines', () => {
    const first = consumeNdjson('', '{"uid":1}\n{"uid":');
    expect(first.lines).toEqual(['{"uid":1}']);
    expect(first.buffer).toBe('{"uid":');
    const second = consumeNdjson(first.buffer, '2}\n');
    expect(second.lines).toEqual(['{"uid":2}']);
    expect(second.buffer).toBe('');
  });

  it('surfaces proxy error lines separately', () => {
    const got = consumeNdjson('', '\n[error] boom\n');
    expect(got.error).toBe('[error] boom');
    expect(got.lines).toEqual([]);
  });
});

describe('upsertByUid', () => {
  it('replaces an existing task and prepends a new one', () => {
    expect(upsertByUid([{ uid: 1, status: 'enqueued' }], { uid: 1, status: 'succeeded' })).toEqual([
      { uid: 1, status: 'succeeded' }
    ]);
    expect(upsertByUid([{ uid: 1, status: 'enqueued' }], { uid: 2, status: 'enqueued' })).toEqual([
      { uid: 2, status: 'enqueued' },
      { uid: 1, status: 'enqueued' }
    ]);
  });
});

describe('consumeChatSse', () => {
  it('concatenates OpenAI deltas and marks [DONE]', () => {
    const chunk =
      'data: {"choices":[{"delta":{"content":"Hi"}}]}\n\ndata: {"choices":[{"delta":{"content":" there"}}]}\ndata: [DONE]\n';
    const got = consumeChatSse('', chunk);
    expect(got.text).toBe('Hi there');
    expect(got.done).toBe(true);
    expect(got.error).toBeNull();
  });

  it('waits for a split data line', () => {
    const first = consumeChatSse('', 'data: {"choices":[{"delta":{"content":"He');
    expect(first.text).toBe('');
    const second = consumeChatSse(first.buffer, 'llo"}}]}\n');
    expect(second.text).toBe('Hello');
  });
});

describe('mediaJsonFromImageUrl', () => {
  it('builds a multimodal image fragment', () => {
    expect(JSON.parse(mediaJsonFromImageUrl('  https://cdn/a.png  '))).toEqual({
      image: { url: 'https://cdn/a.png' }
    });
  });
});

describe('splitDataUrl', () => {
  it('splits a data URL into mime and base64', () => {
    expect(splitDataUrl('data:image/png;base64,aaa')).toEqual({ mime: 'image/png', data: 'aaa' });
    expect(splitDataUrl('https://x')).toBeNull();
  });
});

describe('mediaFromImageFile', () => {
  it('builds the documented media.image mime and data payload', () => {
    expect(JSON.parse(mediaFromImageFile('image/jpeg', 'abc'))).toEqual({
      image: { mime: 'image/jpeg', data: 'abc' }
    });
  });
});

describe('appendLogChunk', () => {
  it('keeps only the newest lines', () => {
    expect(appendLogChunk('a\nb', '\nc\nd', 3)).toBe('b\nc\nd');
  });
});

describe('compositeEmbedder', () => {
  it('builds a composite embedder with indexing and search providers', () => {
    expect(
      compositeEmbedder(
        'combo',
        { source: 'openAi', model: 'text-embedding-3-small', url: '' },
        { source: 'rest', model: '', url: 'http://embed/search' }
      )
    ).toEqual({
      combo: {
        source: 'composite',
        indexingEmbedder: { source: 'openAi', model: 'text-embedding-3-small' },
        searchEmbedder: { source: 'rest', url: 'http://embed/search' }
      }
    });
    expect(compositeEmbedder(' ', { source: 'openAi', model: '', url: '' }, { source: 'rest', model: '', url: '' })).toBeNull();
  });
});

describe('mergeEmbedder', () => {
  it('keeps existing embedders and adds the new one', () => {
    expect(mergeEmbedder({ old: { source: 'ollama' } }, { combo: { source: 'composite' } })).toEqual({
      old: { source: 'ollama' },
      combo: { source: 'composite' }
    });
  });
});

describe('appendForeignKey', () => {
  it('appends a foreign key row', () => {
    expect(appendForeignKey([{ foreignIndexUid: 'products', fieldName: 'productId' }], { foreignIndexUid: 'shops', fieldName: 'shopId' })).toEqual([
      { foreignIndexUid: 'products', fieldName: 'productId' },
      { foreignIndexUid: 'shops', fieldName: 'shopId' }
    ]);
    expect(appendForeignKey([], { foreignIndexUid: ' ', fieldName: 'id' })).toBeNull();
  });
});

describe('settingVisible', () => {
  it('hides foreign keys and chat settings until their flags are on', () => {
    const off = capabilitiesFrom('1.55.0', {});
    const on = capabilitiesFrom('1.55.0', { foreignKeys: true, chatCompletions: true });
    expect(settingVisible('foreignKeys', off)).toBe(false);
    expect(settingVisible('chat', off)).toBe(false);
    expect(settingVisible('displayedAttributes', off)).toBe(true);
    expect(settingVisible('foreignKeys', on)).toBe(true);
    expect(settingVisible('chat', on)).toBe(true);
  });
});

describe('embedderHint', () => {
  it('mentions composite embedders only when that flag is on', () => {
    const base = 'apiKey redacted';
    const off = capabilitiesFrom('1.55.0', {});
    const on = capabilitiesFrom('1.55.0', { compositeEmbedders: true });
    expect(embedderHint(base, off)).toBe(base);
    expect(embedderHint(base, on)).toMatch(/composite/i);
  });
});
