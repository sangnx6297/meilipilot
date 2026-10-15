import { meili } from './client';
import type { Settings, SummarizedTaskView } from './types';

export const SETTING_SLUGS = [
  'displayed-attributes',
  'searchable-attributes',
  'filterable-attributes',
  'sortable-attributes',
  'ranking-rules',
  'stop-words',
  'synonyms',
  'distinct-attribute',
  'typo-tolerance',
  'faceting',
  'pagination',
  'facet-search',
  'prefix-search',
  'separator-tokens',
  'non-separator-tokens',
  'dictionary',
  'proximity-precision',
  'search-cutoff-ms',
  'localized-attributes',
  'embedders',
  'chat',
  'foreign-keys'
] as const;

export type SettingSlug = (typeof SETTING_SLUGS)[number];

export const getSettings = (uid: string) =>
  meili<Settings>('GET', `/indexes/${encodeURIComponent(uid)}/settings`);

export const patchSettings = (uid: string, patch: Partial<Settings>) =>
  meili<SummarizedTaskView>('PATCH', `/indexes/${encodeURIComponent(uid)}/settings`, patch);

export const resetAllSettings = (uid: string) =>
  meili<SummarizedTaskView>('DELETE', `/indexes/${encodeURIComponent(uid)}/settings`);

export const resetSetting = (uid: string, slug: SettingSlug) =>
  meili<SummarizedTaskView>('DELETE', `/indexes/${encodeURIComponent(uid)}/settings/${slug}`);
