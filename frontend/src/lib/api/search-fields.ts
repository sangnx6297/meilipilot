import type { IndexField } from './index-fields';
import type { Settings } from './types';

export const FILTER_OPS = [
  '=',
  '!=',
  'IN',
  '>',
  '>=',
  '<',
  '<=',
  'TO',
  'EXISTS',
  'NOT EXISTS',
  'IS NULL',
  'IS NOT NULL',
  'IS EMPTY',
  'IS NOT EMPTY',
  'CONTAINS',
  'NOT CONTAINS'
] as const;

export type FilterOp = (typeof FILTER_OPS)[number];

const UNARY_OPS = new Set<FilterOp>(['EXISTS', 'NOT EXISTS', 'IS NULL', 'IS NOT NULL', 'IS EMPTY', 'IS NOT EMPTY']);

export type SearchCatalog = {
  retrieve: string[];
  searchOn: string[];
  filterable: IndexField[];
  sortable: string[];
  facets: string[];
  locales: string[];
};

export function buildSearchCatalog(fields: IndexField[]): SearchCatalog {
  const locales = new Set<string>();
  const retrieve: string[] = [];
  const searchOn: string[] = [];
  const filterable: IndexField[] = [];
  const sortable: string[] = [];
  const facets: string[] = [];
  for (const field of fields) {
    if (field.displayed?.enabled) retrieve.push(field.name);
    if (field.searchable?.enabled) searchOn.push(field.name);
    if (field.filterable?.enabled) {
      filterable.push(field);
      const facetOk = field.filterable.equality !== false || field.filterable.comparison === true;
      if (facetOk) facets.push(field.name);
    }
    if (field.sortable?.enabled) sortable.push(field.name);
    for (const locale of field.localized?.locales ?? []) {
      if (locale) locales.add(locale);
    }
  }
  return { retrieve, searchOn, filterable, sortable, facets, locales: [...locales] };
}

export function opsForField(field: IndexField | undefined, contains: boolean): FilterOp[] {
  const equality: FilterOp[] = ['=', '!=', 'IN'];
  const comparison: FilterOp[] = ['>', '>=', '<', '<=', 'TO'];
  const unary: FilterOp[] = ['EXISTS', 'NOT EXISTS', 'IS NULL', 'IS NOT NULL', 'IS EMPTY', 'IS NOT EMPTY'];
  const containsOps: FilterOp[] = contains ? ['CONTAINS', 'NOT CONTAINS'] : [];
  if (!field?.filterable) return [...equality, ...comparison, ...unary, ...containsOps];
  const flags = field.filterable;
  const ops: FilterOp[] = [];
  if (flags.equality !== false) ops.push(...equality);
  if (flags.comparison) ops.push(...comparison);
  ops.push(...unary);
  if (contains && flags.equality !== false) ops.push(...containsOps);
  return ops;
}

export function quoteFilterValue(raw: string): string {
  const value = raw.trim();
  if (value === 'true' || value === 'false' || value === 'null') return value;
  if (/^-?\d+(\.\d+)?$/.test(value)) return value;
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

export function quoteIdent(name: string): string {
  const value = name.trim();
  if (/^[A-Za-z0-9_.*]+$/.test(value)) return value;
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

export function filterClause(row: { attr: string; op: string; value: string; valueTo: string }): string {
  const attr = quoteIdent(row.attr);
  if (!row.attr.trim()) return '';
  const op = row.op as FilterOp;
  if (UNARY_OPS.has(op)) return `${attr} ${op}`;
  if (op === 'TO') {
    if (!row.value.trim() || !row.valueTo.trim()) return '';
    return `${attr} ${quoteFilterValue(row.value)} TO ${quoteFilterValue(row.valueTo)}`;
  }
  if (op === 'IN') {
    const parts = row.value
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean)
      .map(quoteFilterValue);
    if (!parts.length) return '';
    return `${attr} IN [${parts.join(', ')}]`;
  }
  if (!row.value.trim()) return '';
  return `${attr} ${op} ${quoteFilterValue(row.value)}`;
}

export function appendFilter(current: string, clause: string, joiner: 'AND' | 'OR'): string {
  const next = clause.trim();
  if (!next) return current;
  const base = current.trim();
  return base ? `${base} ${joiner} ${next}` : next;
}

export function toggleFilter(current: string, clause: string): string {
  const next = clause.trim();
  if (!next) return current;
  const base = current.trim();
  if (!base) return next;
  if (base === next) return '';
  if (base.includes(` AND ${next}`)) return base.replace(` AND ${next}`, '').trim();
  if (base.includes(`${next} AND `)) return base.replace(`${next} AND `, '').trim();
  return `${base} AND ${next}`;
}

export function facetsForQuery(explicit: string[] | null | undefined, fromSettings: string[]): string[] | undefined {
  if (explicit?.length) return explicit;
  return fromSettings.length ? fromSettings : undefined;
}

export function appendSort(current: string, attr: string, order: 'asc' | 'desc'): string {
  const name = attr.trim();
  if (!name) return current;
  const items = current
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((part) => part !== `${name}:asc` && part !== `${name}:desc`);
  return [...items, `${name}:${order}`].join(', ');
}

function patternNames(value: unknown[] | null | undefined): string[] {
  const names: string[] = [];
  for (const item of value ?? []) {
    if (typeof item === 'string') {
      if (item.trim()) names.push(item.trim());
      continue;
    }
    if (item && typeof item === 'object' && Array.isArray((item as { attributePatterns?: unknown }).attributePatterns)) {
      for (const pattern of (item as { attributePatterns: unknown[] }).attributePatterns) {
        if (typeof pattern === 'string' && pattern.trim()) names.push(pattern.trim());
      }
    }
  }
  return names;
}

function matches(pattern: string, name: string): boolean {
  if (pattern === '*') return true;
  if (pattern.endsWith('*')) return name.startsWith(pattern.slice(0, -1));
  return pattern === name;
}

function allowAll(list: string[] | null | undefined): boolean {
  return !list || list.length === 0 || list.includes('*');
}

export function fieldsFromFallback(names: string[], settings: Settings | null): IndexField[] {
  const extra = [
    ...(settings?.searchableAttributes ?? []),
    ...(settings?.displayedAttributes ?? []),
    ...(settings?.sortableAttributes ?? []),
    ...patternNames(settings?.filterableAttributes)
  ].filter((name) => name && name !== '*');
  const all = [...new Set([...names, ...extra])];
  const sortable = new Set(settings?.sortableAttributes ?? []);
  const filterable = patternNames(settings?.filterableAttributes);
  const localized = (settings?.localizedAttributes ?? []) as { locales?: string[]; attributePatterns?: string[] }[];
  return all.map((name) => {
    const locales = new Set<string>();
    for (const row of localized) {
      const patterns = row.attributePatterns ?? [];
      if (patterns.some((pattern) => matches(pattern, name))) {
        for (const locale of row.locales ?? []) locales.add(locale);
      }
    }
    return {
      name,
      displayed: { enabled: allowAll(settings?.displayedAttributes) || (settings?.displayedAttributes ?? []).includes(name) },
      searchable: { enabled: allowAll(settings?.searchableAttributes) || (settings?.searchableAttributes ?? []).includes(name) },
      sortable: { enabled: sortable.has(name) },
      distinct: { enabled: settings?.distinctAttribute === name },
      filterable: {
        enabled: filterable.some((pattern) => matches(pattern, name)),
        equality: true,
        comparison: true,
        facetSearch: true
      },
      localized: { locales: [...locales] }
    };
  });
}
