import { describe, it, expect, beforeEach } from 'vitest';
import {
  splitDocMeta,
  rowId,
  rowLabel,
  hasMeta,
  rankingMeta,
  hasRankingMeta,
  tableColumns,
  cellPreview,
  cellTitle,
  columnAlign,
  formattedHtml,
  visibleColumns,
  moveColumn,
  loadHitsViewMode,
  saveHitsViewMode,
  loadVisibleFields,
  saveVisibleFields,
  HITS_VIEW_MODE_KEY
} from './hits';

describe('splitDocMeta', () => {
  it('splits underscore keys into meta', () => {
    const { doc, meta } = splitDocMeta({
      id: 12,
      title: 'Winter Feast',
      _formatted: { title: '<em>Winter</em> Feast' },
      _rankingScore: 0.94
    });
    expect(doc).toEqual({ id: 12, title: 'Winter Feast' });
    expect(meta).toEqual({
      _formatted: { title: '<em>Winter</em> Feast' },
      _rankingScore: 0.94
    });
  });
});

describe('rowId', () => {
  it('prefers id then uid', () => {
    expect(rowId({ id: 12, uid: 'x' })).toBe('12');
    expect(rowId({ uid: 'abc' })).toBe('abc');
    expect(rowId({ title: 'no' })).toBe('');
    expect(rowId({ sku: 'A-1', id: 4 }, 'sku')).toBe('A-1');
  });
});

describe('rowLabel', () => {
  it('uses title then name then id then uid', () => {
    expect(rowLabel({ title: 'Winter Feast', id: 1 })).toBe('Winter Feast');
    expect(rowLabel({ name: 'Snow', id: 1 })).toBe('Snow');
    expect(rowLabel({ id: 44 })).toBe('44');
    expect(rowLabel({ uid: 'u1' })).toBe('u1');
    expect(rowLabel({})).toBe('(untitled)');
  });

  it('falls back to the first non-empty string field', () => {
    expect(rowLabel({ outline: 'CT001', city: 'aac', year: 2026 })).toBe('CT001');
    expect(rowLabel({ year: 2026, outline: 'CT001' })).toBe('CT001');
    expect(rowLabel({ year: 2026, month: 10 })).toBe('2026');
    expect(rowLabel({ _formatted: { title: 'x' }, notes: '' })).toBe('(untitled)');
  });
});

describe('hasMeta', () => {
  it('is false when no underscore keys', () => {
    expect(hasMeta({ id: 1, title: 'a' })).toBe(false);
  });
  it('is true when meta exists', () => {
    expect(hasMeta({ id: 1, _rankingScore: 0.2 })).toBe(true);
  });
});

describe('rankingMeta', () => {
  it('keeps ranking score and rule details, drops _formatted', () => {
    expect(
      rankingMeta({
        title: 'A',
        _formatted: { title: '<em>A</em>' },
        _rankingScore: 0.91,
        _rankingScoreDetails: { words: { order: 0 } },
        _matchesPosition: { title: [] }
      })
    ).toEqual({
      _rankingScore: 0.91,
      _rankingScoreDetails: { words: { order: 0 } }
    });
    expect(hasRankingMeta({ _formatted: { title: 'A' } })).toBe(false);
    expect(hasRankingMeta({ _rankingScore: 1, _semanticScore: 0.2 })).toBe(true);
  });
});

describe('tableColumns', () => {
  it('unions document keys in first-seen order and skips meta', () => {
    expect(
      tableColumns([
        { title: 'A', id: 1, _formatted: { title: 'A' } },
        { title: 'B', genres: ['drama'], id: 2 }
      ])
    ).toEqual(['title', 'id', 'genres']);
  });
});

describe('cellPreview', () => {
  it('keeps scalars and collapses nested JSON', () => {
    expect(cellPreview('hello')).toBe('hello');
    expect(cellPreview(3)).toBe('3');
    expect(cellPreview({ a: 1 })).toBe('{…}');
    expect(cellPreview(['a', 'b'])).toBe('[2]');
    expect(cellPreview(null)).toBe('');
  });
});

describe('cellTitle', () => {
  it('shows full scalar or JSON for tooltip', () => {
    expect(cellTitle(null)).toBe('');
    expect(cellTitle('hello')).toBe('hello');
    expect(cellTitle(3)).toBe('3');
    expect(cellTitle({ a: 1 })).toBe('{"a":1}');
    expect(cellTitle(['a', 'b'])).toBe('["a","b"]');
  });
});

describe('columnAlign', () => {
  it('rights numeric-only columns and lefts mixed or empty', () => {
    expect(columnAlign([{ year: 2026 }, { year: 2019 }, { year: null }], 'year')).toBe('right');
    expect(columnAlign([{ code: 'CT001' }, { code: 1 }], 'code')).toBe('left');
    expect(columnAlign([{ notes: null }, { notes: undefined }], 'notes')).toBe('left');
    expect(columnAlign([{ ok: true }, { ok: false }], 'ok')).toBe('left');
  });
});

describe('visibleColumns', () => {
  it('returns all columns when nothing is selected', () => {
    expect(visibleColumns(['id', 'city', 'notes'], [])).toEqual(['id', 'city', 'notes']);
  });

  it('keeps selected fields in chosen order and ignores unknown names', () => {
    expect(visibleColumns(['id', 'city', 'notes', 'year'], ['notes', 'id', 'nope'])).toEqual(['notes', 'id']);
  });

  it('falls back to all when selected fields are missing from this page', () => {
    expect(visibleColumns(['id', 'city'], ['outline'])).toEqual(['id', 'city']);
  });
});

describe('moveColumn', () => {
  it('moves a column to a new index', () => {
    expect(moveColumn(['id', 'city', 'notes', 'year'], 0, 2)).toEqual(['city', 'notes', 'id', 'year']);
    expect(moveColumn(['id', 'city', 'notes'], 2, 0)).toEqual(['notes', 'id', 'city']);
    expect(moveColumn(['id', 'city'], 0, 0)).toEqual(['id', 'city']);
    expect(moveColumn(['id', 'city'], -1, 1)).toEqual(['id', 'city']);
    expect(moveColumn(['id', 'city'], 0, 9)).toEqual(['id', 'city']);
  });
});

describe('visible fields persist', () => {
  beforeEach(() => localStorage.clear());

  it('is empty when missing or invalid', () => {
    expect(loadVisibleFields('movies')).toEqual([]);
    localStorage.setItem('meili.hitsVisibleFields:movies', '{');
    expect(loadVisibleFields('movies')).toEqual([]);
  });

  it('round-trips per index uid without mixing indexes', () => {
    saveVisibleFields('movies', ['title', 'id']);
    saveVisibleFields('books', ['isbn']);
    expect(loadVisibleFields('movies')).toEqual(['title', 'id']);
    expect(loadVisibleFields('books')).toEqual(['isbn']);
  });
});

describe('formattedHtml', () => {
  it('returns only string values from _formatted', () => {
    const meta = { _formatted: { title: '<em>Winter</em>', nested: { a: 1 } } };
    expect(formattedHtml(meta, 'title')).toBe('<em>Winter</em>');
    expect(formattedHtml(meta, 'nested')).toBeNull();
    expect(formattedHtml({}, 'title')).toBeNull();
  });
});

describe('hits view mode persist', () => {
  beforeEach(() => localStorage.clear());

  it('defaults to table when missing or invalid', () => {
    expect(loadHitsViewMode()).toBe('table');
    localStorage.setItem(HITS_VIEW_MODE_KEY, 'nope');
    expect(loadHitsViewMode()).toBe('table');
  });

  it('round-trips a valid mode', () => {
    saveHitsViewMode('detail');
    expect(localStorage.getItem(HITS_VIEW_MODE_KEY)).toBe('detail');
    expect(loadHitsViewMode()).toBe('detail');
  });
});
