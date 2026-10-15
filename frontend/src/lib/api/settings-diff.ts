import type { Settings } from './types';
import { SETTING_GROUPS } from './settings-form';

export type SettingChange = {
  field: keyof Settings;
  slug: string;
  label: string;
  source: unknown;
  target: unknown;
};

export function compareSettings(source: Settings, target: Settings): SettingChange[] {
  const out: SettingChange[] = [];
  for (const g of SETTING_GROUPS) {
    const a = source[g.field];
    const b = target[g.field];
    if (JSON.stringify(a) === JSON.stringify(b)) continue;
    out.push({ field: g.field, slug: g.slug, label: g.label, source: a, target: b });
  }
  return out;
}

export function selectedChanges(changes: SettingChange[], slugs: string[]): SettingChange[] {
  const want = new Set(slugs);
  return changes.filter((c) => want.has(c.slug));
}

export function patchFromSource(changes: SettingChange[], slugs: string[]): Partial<Settings> {
  const patch: Partial<Settings> = {};
  for (const c of selectedChanges(changes, slugs)) {
    (patch as Record<string, unknown>)[c.field] = c.source;
  }
  return patch;
}

export type DiffExportMeta = {
  source: { profile: string; index: string };
  target: { profile: string; index: string };
  at: string;
};

export function exportDiffJson(meta: DiffExportMeta, changes: SettingChange[]): string {
  return JSON.stringify(
    {
      ...meta,
      groups: changes.map((c) => ({
        slug: c.slug,
        field: c.field,
        label: c.label,
        source: c.source,
        target: c.target
      }))
    },
    null,
    2
  );
}

export function exportDiffMarkdown(meta: DiffExportMeta, changes: SettingChange[]): string {
  const lines = [
    '# Settings diff',
    '',
    `- Source: ${meta.source.profile} / ${meta.source.index}`,
    `- Target: ${meta.target.profile} / ${meta.target.index}`,
    `- At: ${meta.at}`,
    `- Groups: ${changes.length}`,
    ''
  ];
  for (const c of changes) {
    lines.push(`## ${c.label} (\`${c.slug}\`)`, '', '### Source', '```json');
    lines.push(JSON.stringify(c.source, null, 2), '```', '', '### Target', '```json');
    lines.push(JSON.stringify(c.target, null, 2), '```', '');
  }
  return lines.join('\n');
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => canonicalJson(item)).join(',')}]`;
  const keys = Object.keys(value as object).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalJson((value as Record<string, unknown>)[k])}`).join(',')}}`;
}

export function settingsFingerprint(settings: Settings): string {
  return canonicalJson(settings);
}

export function hasSettingsDrift(baseline: string, current: Settings): boolean {
  return settingsFingerprint(current) !== baseline;
}

export type RiskLevel = 'low' | 'reindex' | 'secret';

export type MigrationRisk = { slug: string; level: RiskLevel; label: string };

const REINDEX = new Set([
  'searchable-attributes',
  'filterable-attributes',
  'sortable-attributes',
  'ranking-rules',
  'typo-tolerance',
  'embedders',
  'localized-attributes',
  'separator-tokens',
  'non-separator-tokens',
  'dictionary',
  'prefix-search',
  'proximity-precision',
  'distinct-attribute'
]);

const SECRET = new Set(['embedders']);

export function migrationRisks(slugs: string[]): MigrationRisk[] {
  return slugs.map((slug) => {
    const label = SETTING_GROUPS.find((g) => g.slug === slug)?.label ?? slug;
    if (SECRET.has(slug)) return { slug, level: 'secret' as const, label };
    if (REINDEX.has(slug)) return { slug, level: 'reindex' as const, label };
    return { slug, level: 'low' as const, label };
  });
}

export function previewPatchJson(patch: Partial<Settings>): string {
  return JSON.stringify(patch, null, 2);
}

export function downloadText(filename: string, text: string, mime = 'text/plain'): void {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
