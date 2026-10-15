import { describe, it, expect, beforeEach } from 'vitest';
import { EMPTY_SEARCH_FORM } from '../api/search-form';
import { compareHitIds, compareSearchRuns, loadHistory, pushHistory, scoresFromHits } from './search-history';

describe('search history', () => {
  beforeEach(() => localStorage.clear());

  it('stores newest first and caps length', () => {
    for (let i = 0; i < 35; i++) {
      pushHistory({
        indexUid: 'movies',
        form: { ...EMPTY_SEARCH_FORM, q: String(i) },
        query: { q: String(i) },
        processingTimeMs: i,
        hitCount: 1,
        hitIds: [String(i)]
      });
    }
    const items = loadHistory('movies');
    expect(items).toHaveLength(30);
    expect(items[0].query.q).toBe('34');
    expect(loadHistory('books')).toEqual([]);
  });
});

describe('compareHitIds', () => {
  it('detects order change and exclusive ids', () => {
    const c = compareHitIds(['a', 'b', 'c'], ['b', 'a', 'd']);
    expect(c.onlyA).toEqual(['c']);
    expect(c.onlyB).toEqual(['d']);
    expect(c.orderChanged).toBe(true);
    expect(compareHitIds(['a', 'b'], ['a', 'b']).orderChanged).toBe(false);
  });
});

describe('scoresFromHits', () => {
  it('maps id to _rankingScore', () => {
    expect(scoresFromHits([{ id: 1, _rankingScore: 0.9 }, { uid: 'x' }])).toEqual({
      '1': 0.9,
      x: null
    });
  });
});

describe('compareSearchRuns', () => {
  it('compares latency, order and per-doc rankingScore', () => {
    const a = {
      at: 1,
      indexUid: 'movies',
      form: { ...EMPTY_SEARCH_FORM },
      query: { q: 'winter' },
      processingTimeMs: 12,
      hitCount: 2,
      hitIds: ['a', 'b'],
      hitScores: { a: 0.9, b: 0.4 }
    };
    const b = {
      ...a,
      at: 2,
      processingTimeMs: 20,
      hitIds: ['b', 'a', 'c'],
      hitScores: { a: 0.7, b: 0.8, c: 0.1 }
    };
    const cmp = compareSearchRuns(a, b);
    expect(cmp.ids.orderChanged).toBe(true);
    expect(cmp.ids.onlyB).toEqual(['c']);
    expect(cmp.latencyDelta).toBe(8);
    const byId = Object.fromEntries(cmp.docs.map((d) => [d.id, d]));
    expect(byId.a).toMatchObject({ rankA: 1, rankB: 2, scoreA: 0.9, scoreB: 0.7, scoreDelta: -0.2, rankDelta: 1 });
    expect(byId.c).toMatchObject({ rankA: null, rankB: 3, scoreA: null, scoreB: 0.1 });
  });
});
