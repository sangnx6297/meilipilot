import type { InstanceStats } from '../api/types';

export function formatBytes(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n) || n < 0) return '—';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = n;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const digits = unit === 0 ? 0 : 1;
  return `${value.toFixed(digits)} ${units[unit]}`;
}

export function formatByteLabel(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n) || n < 0) return '—';
  return `${formatBytes(n)} (${n.toLocaleString('en-US')} bytes)`;
}

export function formatLastUpdate(iso: string | null, now = Date.now()): string {
  if (!iso) return '—';
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return iso;
  const sec = Math.max(0, Math.round((now - t) / 1000));
  if (sec < 5) return 'vừa xong';
  if (sec < 60) return `${sec}s trước`;
  if (sec < 3600) return `${Math.floor(sec / 60)} phút trước`;
  if (sec < 86400) return `${Math.floor(sec / 3600)} giờ trước`;
  return new Date(t).toLocaleString();
}

export type StorageSummary = {
  indexCount: number;
  documentCount: number;
  indexingCount: number;
  databaseSize: number;
  usedDatabaseSize: number | null;
  reclaimable: number | null;
  usedPct: number | null;
  lastUpdate: string | null;
};

export function summarizeStats(stats: InstanceStats): StorageSummary {
  const indexes = Object.values(stats.indexes ?? {});
  const used = typeof stats.usedDatabaseSize === 'number' ? stats.usedDatabaseSize : null;
  const databaseSize = stats.databaseSize ?? 0;
  const reclaimable = used == null ? null : Math.max(0, databaseSize - used);
  const usedPct = used == null || databaseSize <= 0 ? null : Math.min(100, (used / databaseSize) * 100);
  return {
    indexCount: indexes.length,
    documentCount: indexes.reduce((sum, idx) => sum + (idx.numberOfDocuments ?? 0), 0),
    indexingCount: indexes.filter((idx) => idx.isIndexing).length,
    databaseSize,
    usedDatabaseSize: used,
    reclaimable,
    usedPct,
    lastUpdate: stats.lastUpdate ?? null
  };
}

export type IndexStorageRow = {
  uid: string;
  docs: number;
  isIndexing: boolean;
  indexSize: number | null;
  usedIndexSize: number | null;
  reclaimable: number | null;
  embeddings: number | null;
};

export function indexStorageRows(stats: InstanceStats): IndexStorageRow[] {
  return Object.entries(stats.indexes ?? {})
    .map(([uid, s]) => {
      const indexSize = typeof s.indexSize === 'number' ? s.indexSize : null;
      const usedIndexSize = typeof s.usedIndexSize === 'number' ? s.usedIndexSize : null;
      return {
        uid,
        docs: s.numberOfDocuments,
        isIndexing: s.isIndexing,
        indexSize,
        usedIndexSize,
        reclaimable: indexSize == null || usedIndexSize == null ? null : Math.max(0, indexSize - usedIndexSize),
        embeddings: typeof s.numberOfEmbeddings === 'number' ? s.numberOfEmbeddings : null
      };
    })
    .sort((a, b) => (b.indexSize ?? -1) - (a.indexSize ?? -1) || a.uid.localeCompare(b.uid));
}

export type ChartBar = {
  uid: string;
  value: number;
  pct: number;
  label: string;
  isIndexing: boolean;
};

export function indexChartBars(
  rows: IndexStorageRow[],
  metric: 'docs' | 'size',
  limit = 10
): ChartBar[] {
  const items = rows
    .map((r) => ({
      uid: r.uid,
      value: metric === 'docs' ? r.docs : (r.indexSize ?? r.usedIndexSize ?? 0),
      isIndexing: r.isIndexing
    }))
    .filter((r) => r.value > 0)
    .sort((a, b) => b.value - a.value || a.uid.localeCompare(b.uid));
  if (!items.length) return [];
  const head = items.slice(0, limit);
  const rest = items.slice(limit);
  if (rest.length) {
    head.push({
      uid: '(others)',
      value: rest.reduce((sum, r) => sum + r.value, 0),
      isIndexing: rest.some((r) => r.isIndexing)
    });
  }
  const max = Math.max(...head.map((r) => r.value));
  return head.map((r) => ({
    uid: r.uid,
    value: r.value,
    pct: max > 0 ? (r.value / max) * 100 : 0,
    label: metric === 'docs' ? r.value.toLocaleString('en-US') : formatBytes(r.value),
    isIndexing: r.isIndexing
  }));
}

export type PrometheusSample = {
  name: string;
  labels: Record<string, string>;
  value: number;
};

function splitPromLine(line: string): { name: string; labelsRaw: string | null; value: string } | null {
  const nameMatch = line.match(/^([a-zA-Z_:][a-zA-Z0-9_:]*)(.*)$/);
  if (!nameMatch) return null;
  let rest = nameMatch[2];
  let labelsRaw: string | null = null;
  if (rest.startsWith('{')) {
    let i = 1;
    let inQuote = false;
    let escape = false;
    for (; i < rest.length; i += 1) {
      const c = rest[i];
      if (escape) {
        escape = false;
        continue;
      }
      if (c === '\\' && inQuote) {
        escape = true;
        continue;
      }
      if (c === '"') {
        inQuote = !inQuote;
        continue;
      }
      if (c === '}' && !inQuote) break;
    }
    labelsRaw = rest.slice(1, i);
    rest = rest.slice(i + 1);
  }
  const value = rest.trim().split(/\s+/)[0];
  if (!value) return null;
  return { name: nameMatch[1], labelsRaw, value };
}

export function parsePrometheus(text: string): PrometheusSample[] {
  const out: PrometheusSample[] = [];
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const parsed = splitPromLine(line);
    if (!parsed) continue;
    const value = Number(parsed.value);
    if (!Number.isFinite(value)) continue;
    const labels: Record<string, string> = {};
    if (parsed.labelsRaw) {
      for (const part of parsed.labelsRaw.split(',')) {
        const kv = part.match(/^\s*([a-zA-Z_][a-zA-Z0-9_]*)="((?:\\.|[^"\\])*)"\s*$/);
        if (kv) labels[kv[1]] = kv[2].replace(/\\\\/g, '\\').replace(/\\"/g, '"');
      }
    }
    out.push({ name: parsed.name, labels, value });
  }
  return out;
}

export type HealthMetrics = {
  isIndexing: boolean | null;
  searchesRunning: number | null;
  searchesWaiting: number | null;
  searchQueueSize: number | null;
  taskQueueLatencySec: number | null;
  tasksEnqueued: number | null;
  tasksProcessing: number | null;
  tasksFailed: number | null;
  httpRequests: number | null;
  degradedSearches: number | null;
};

function unlabeled(samples: PrometheusSample[], name: string): number | null {
  const hit = samples.find((s) => s.name === name && Object.keys(s.labels).length === 0);
  return hit ? hit.value : null;
}

function labeled(samples: PrometheusSample[], name: string, want: Record<string, string>): number | null {
  const hit = samples.find(
    (s) => s.name === name && Object.entries(want).every(([k, v]) => s.labels[k] === v)
  );
  return hit ? hit.value : null;
}

export function summarizeMetrics(samples: PrometheusSample[]): HealthMetrics {
  const indexing = unlabeled(samples, 'meilisearch_is_indexing');
  const http = samples.filter((s) => s.name === 'meilisearch_http_requests_total');
  return {
    isIndexing: indexing == null ? null : indexing === 1,
    searchesRunning: unlabeled(samples, 'meilisearch_searches_running'),
    searchesWaiting: unlabeled(samples, 'meilisearch_searches_waiting_to_be_processed'),
    searchQueueSize: unlabeled(samples, 'meilisearch_search_queue_size'),
    taskQueueLatencySec: unlabeled(samples, 'meilisearch_task_queue_latency_seconds'),
    tasksEnqueued: labeled(samples, 'meilisearch_nb_tasks', { kind: 'statuses', value: 'enqueued' }),
    tasksProcessing: labeled(samples, 'meilisearch_nb_tasks', { kind: 'statuses', value: 'processing' }),
    tasksFailed: labeled(samples, 'meilisearch_nb_tasks', { kind: 'statuses', value: 'failed' }),
    httpRequests: http.length ? http.reduce((sum, s) => sum + s.value, 0) : null,
    degradedSearches: unlabeled(samples, 'meilisearch_degraded_search_requests')
  };
}
