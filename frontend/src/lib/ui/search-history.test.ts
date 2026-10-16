import { describe, it, expect, beforeEach } from 'vitest';
import { EMPTY_SEARCH_FORM } from '../api/search-form';
import { compareHitIds, compareSearchRuns, findSnapshot, loadHistory, loadLastIndex, loadSearchDraft, pushHistory, saveLastIndex, saveSearchDraft, scoresFromHits, snapsFromHits } from './search-history';

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

  it('drops bulky media and vectors before saving', () => {
    pushHistory({
      indexUid: 'movies',
      form: { ...EMPTY_SEARCH_FORM, mediaJson: 'x'.repeat(5000), vector: '1,'.repeat(300) },
      query: { q: 'a', media: { image: { data: 'abc' } }, vector: Array.from({ length: 40 }, () => 0.1) },
      hitIds: ['1']
    });
    const saved = loadHistory('movies')[0];
    expect(saved.form.mediaJson).toBe('');
    expect(saved.form.vector).toBe('');
    expect(saved.query.media).toBeUndefined();
    expect(saved.query.vector).toBeUndefined();
    expect(saved.query.q).toBe('a');
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

  it('uses the index primary key when the document has no id', () => {
    const snap = snapsFromHits([{ sku: 'A-1', title: 'Áo', _rankingScore: 0.5 }], 'sku');
    expect(snap.hitIds).toEqual(['A-1']);
    expect(snap.hitLabels).toEqual({ 'A-1': 'Áo' });
    expect(snap.hitScores).toEqual({ 'A-1': 0.5 });
  });
});

describe('findSnapshot', () => {
  it('resolves a run by its at:index key', () => {
    const items = [
      { at: 20, indexUid: 'movies', form: { ...EMPTY_SEARCH_FORM }, query: { q: 'b' } },
      { at: 10, indexUid: 'movies', form: { ...EMPTY_SEARCH_FORM }, query: { q: 'a' } }
    ];
    expect(findSnapshot(items, '10:1')?.query.q).toBe('a');
    expect(findSnapshot(items, '10:0')).toBeUndefined();
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
    expect(byId.a).toMatchObject({ label: 'a', rankA: 1, rankB: 2, scoreA: 0.9, scoreB: 0.7, scoreDelta: -0.2, rankDelta: 1 });
    expect(byId.c).toMatchObject({ rankA: null, rankB: 3, scoreA: null, scoreB: 0.1 });
  });

  it('remembers the last selected index per profile', () => {
    expect(loadLastIndex('')).toBe('');
    saveLastIndex('p1', 'outlets');
    saveLastIndex('p2', 'movies');
    saveLastIndex('', 'ignored');
    saveLastIndex('p1', '');
    expect(loadLastIndex('p1')).toBe('outlets');
    expect(loadLastIndex('p2')).toBe('movies');
    expect(loadLastIndex('missing')).toBe('');
  });

  it('restores search settings per profile and index', () => {
    saveSearchDraft('p1', 'outlets', {
      mode: 'form',
      form: { ...EMPTY_SEARCH_FORM, q: 'hanoi', filter: 'dis_code = "01"', facets: 'dis_code', showRankingScore: false },
      jsonText: ''
    });
    saveSearchDraft('p1', 'movies', {
      mode: 'json',
      form: { ...EMPTY_SEARCH_FORM, q: 'other' },
      jsonText: '{"q":"other"}'
    });
    const outlets = loadSearchDraft('p1', 'outlets');
    expect(outlets?.form.q).toBe('hanoi');
    expect(outlets?.form.filter).toBe('dis_code = "01"');
    expect(outlets?.form.facets).toBe('dis_code');
    expect(outlets?.form.showRankingScore).toBe(false);
    expect(outlets?.form.limit).toBe('20');
    expect(loadSearchDraft('p1', 'movies')?.mode).toBe('json');
    expect(loadSearchDraft('p2', 'outlets')).toBeNull();
  });

  it('drops bulky media and unknown form keys from a draft', () => {
    saveSearchDraft('p1', 'outlets', {
      mode: 'form',
      form: { ...EMPTY_SEARCH_FORM, mediaJson: 'x'.repeat(800), vector: '1,'.repeat(200), matchingStrategy: 'nope' as 'last' },
      jsonText: 'y'.repeat(25000)
    });
    const saved = loadSearchDraft('p1', 'outlets');
    expect(saved?.form.mediaJson).toBe('');
    expect(saved?.form.vector).toBe('');
    expect(saved?.form.matchingStrategy).toBe('last');
    expect(saved?.jsonText).toHaveLength(20000);
  });

  it('restores the open search tab and filter controls', () => {
    saveSearchDraft('p1', 'outlets', {
      mode: 'form',
      form: { ...EMPTY_SEARCH_FORM },
      jsonText: '',
      panel: {
        tab: 'filter',
        sortAttr: 'year',
        sortOrder: 'desc',
        filterAttr: 'dis_code',
        filterOp: '=',
        filterValue: '01',
        filterValueTo: '',
        filterJoin: 'AND'
      }
    });
    const saved = loadSearchDraft('p1', 'outlets');
    expect(saved?.panel.tab).toBe('filter');
    expect(saved?.panel.sortAttr).toBe('year');
    expect(saved?.panel.sortOrder).toBe('desc');
    expect(saved?.panel.filterAttr).toBe('dis_code');
    expect(saved?.panel.filterValue).toBe('01');
  });
});
