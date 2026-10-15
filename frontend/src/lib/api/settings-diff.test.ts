import { describe, it, expect } from 'vitest';
import type { Settings } from './types';
import { SETTING_GROUPS } from './settings-form';
import {
  compareSettings,
  exportDiffJson,
  exportDiffMarkdown,
  hasSettingsDrift,
  migrationRisks,
  patchFromSource,
  previewPatchJson,
  selectedChanges,
  settingsFingerprint
} from './settings-diff';

const base = (): Settings => ({
  displayedAttributes: ['*'],
  searchableAttributes: ['*'],
  filterableAttributes: [],
  sortableAttributes: [],
  foreignKeys: [],
  rankingRules: ['words', 'typo', 'proximity', 'attribute', 'sort', 'exactness'],
  stopWords: [],
  nonSeparatorTokens: [],
  separatorTokens: [],
  dictionary: [],
  synonyms: {},
  distinctAttribute: null,
  proximityPrecision: 'byWord',
  typoTolerance: { enabled: true, minWordSizeForTypos: { oneTypo: 5, twoTypos: 9 } },
  faceting: { maxValuesPerFacet: 100, sortFacetValuesBy: { '*': 'alpha' } },
  pagination: { maxTotalHits: 1000 },
  embedders: {},
  searchCutoffMs: null,
  localizedAttributes: [],
  facetSearch: true,
  prefixSearch: 'indexingTime',
  chat: { description: '', documentTemplate: '' }
});

describe('compareSettings', () => {
  it('keeps ranking rule order as a real difference', () => {
    const a = base();
    const b = base();
    b.rankingRules = ['typo', 'words', 'proximity', 'attribute', 'sort', 'exactness'];
    const diffs = compareSettings(a, b);
    expect(diffs.map((d) => d.field)).toEqual(['rankingRules']);
    expect(diffs[0].source).toEqual(a.rankingRules);
    expect(diffs[0].target).toEqual(b.rankingRules);
  });

  it('returns empty when equal and covers every setting group field', () => {
    expect(compareSettings(base(), base())).toEqual([]);
    const fields = new Set(SETTING_GROUPS.map((g) => g.field));
    const a = base();
    const b = base();
    b.stopWords = ['the'];
    b.searchCutoffMs = 10;
    const diffs = compareSettings(a, b);
    expect(diffs.every((d) => fields.has(d.field))).toBe(true);
    expect(diffs.map((d) => d.field).sort()).toEqual(['searchCutoffMs', 'stopWords']);
  });
});

describe('selectedChanges + patchFromSource', () => {
  it('keeps chosen groups and builds a source→target PATCH', () => {
    const a = base();
    const b = base();
    a.stopWords = ['the'];
    a.rankingRules = ['typo', 'words', 'proximity', 'attribute', 'sort', 'exactness'];
    b.searchCutoffMs = 50;
    const diffs = compareSettings(a, b);
    const picked = selectedChanges(diffs, ['stop-words', 'nope']);
    expect(picked.map((d) => d.slug)).toEqual(['stop-words']);
    expect(patchFromSource(diffs, ['ranking-rules', 'stop-words'])).toEqual({
      rankingRules: a.rankingRules,
      stopWords: ['the']
    });
    expect(patchFromSource(diffs, [])).toEqual({});
  });
});

describe('export diff', () => {
  it('writes JSON and Markdown for selected groups', () => {
    const a = base();
    const b = base();
    a.stopWords = ['the'];
    const diffs = compareSettings(a, b);
    const meta = {
      source: { profile: 'dev', index: 'movies' },
      target: { profile: 'prod', index: 'movies' },
      at: '2026-10-15T00:00:00.000Z'
    };
    const json = JSON.parse(exportDiffJson(meta, diffs));
    expect(json.source.index).toBe('movies');
    expect(json.groups).toHaveLength(1);
    expect(json.groups[0].slug).toBe('stop-words');
    const md = exportDiffMarkdown(meta, diffs);
    expect(md).toContain('# Settings diff');
    expect(md).toContain('stop-words');
    expect(md).toContain('"the"');
  });
});

describe('fingerprint + drift + risk', () => {
  it('is stable regardless of object key order', () => {
    const a = base();
    const shuffled = JSON.parse(JSON.stringify(a)) as Settings;
    const fp = settingsFingerprint(a);
    expect(settingsFingerprint(shuffled)).toBe(fp);
    expect(hasSettingsDrift(fp, a)).toBe(false);
    shuffled.stopWords = ['the'];
    expect(hasSettingsDrift(fp, shuffled)).toBe(true);
  });

  it('labels reindex and secret groups', () => {
    const risks = migrationRisks(['stop-words', 'ranking-rules', 'embedders']);
    expect(risks.find((r) => r.slug === 'ranking-rules')?.level).toBe('reindex');
    expect(risks.find((r) => r.slug === 'embedders')?.level).toBe('secret');
    expect(risks.find((r) => r.slug === 'stop-words')?.level).toBe('low');
  });

  it('pretty-prints the PATCH payload', () => {
    expect(previewPatchJson({ stopWords: ['the'] })).toContain('"stopWords"');
  });
});
