import { addOrUpdate, deleteAllDocuments, fetchDocuments } from './documents';
import { createIndex, getIndex, listIndexes } from './indexes';
import { getSettings, patchSettings } from './settings';
import { MeiliError } from './client';
import { waitTask } from './tasks';
import type { Settings } from './types';

export const DUMP_VERSION = 1;
export const DOCUMENT_BATCH = 200;

export type IndexDump = {
  uid: string;
  primaryKey: string | null;
  settings: Settings;
  documents: Record<string, unknown>[];
};

export type MeiliDump = {
  meilipilot: typeof DUMP_VERSION;
  kind: 'index' | 'instance';
  dumpedAt: string;
  indexes: IndexDump[];
};

export function settingsForRestore(settings: Settings): Settings {
  const next = structuredClone(settings);
  if (!next.embedders) return next;
  for (const value of Object.values(next.embedders)) {
    if (value && typeof value === 'object') delete (value as Record<string, unknown>).apiKey;
  }
  return next;
}

export function documentBatches<T>(docs: T[], size = DOCUMENT_BATCH): T[][] {
  const step = Math.max(1, size);
  const out: T[][] = [];
  for (let i = 0; i < docs.length; i += step) out.push(docs.slice(i, i + step));
  return out;
}

export function dumpFileName(dump: MeiliDump): string {
  const stamp = (dump.dumpedAt || 'dump').slice(0, 19).replace(/[:T]/g, '-');
  const name = dump.indexes.length === 1 ? dump.indexes[0].uid : 'instance';
  return `${name}-${stamp}.json`;
}

function parseIndex(raw: unknown): IndexDump {
  if (!raw || typeof raw !== 'object') throw new Error('Index trong dump không hợp lệ');
  const row = raw as Record<string, unknown>;
  const uid = typeof row.uid === 'string' ? row.uid.trim() : '';
  if (!uid) throw new Error('Dump thiếu uid');
  if (!row.settings || typeof row.settings !== 'object' || Array.isArray(row.settings)) {
    throw new Error(`Settings của ${uid} không hợp lệ`);
  }
  if (!Array.isArray(row.documents)) throw new Error(`Documents của ${uid} không hợp lệ`);
  return {
    uid,
    primaryKey: typeof row.primaryKey === 'string' && row.primaryKey ? row.primaryKey : null,
    settings: row.settings as Settings,
    documents: row.documents as Record<string, unknown>[]
  };
}

export function parseDump(text: string): MeiliDump {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error('File dump không phải JSON');
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('File dump không hợp lệ');
  const body = raw as Record<string, unknown>;
  if (body.meilipilot !== DUMP_VERSION || !Array.isArray(body.indexes)) {
    throw new Error('File không phải dump MeiliPilot');
  }
  const indexes = body.indexes.map(parseIndex);
  if (!indexes.length) throw new Error('Dump không có index');
  return {
    meilipilot: DUMP_VERSION,
    kind: body.kind === 'instance' ? 'instance' : 'index',
    dumpedAt: typeof body.dumpedAt === 'string' ? body.dumpedAt : '',
    indexes
  };
}

export async function listAllIndexUids(): Promise<string[]> {
  const uids: string[] = [];
  let offset = 0;
  for (;;) {
    const page = await listIndexes(offset, 100);
    for (const index of page.results ?? []) uids.push(index.uid);
    offset += page.results?.length ?? 0;
    if (!page.results?.length || offset >= page.total) break;
  }
  return uids;
}

async function fetchAllDocuments(uid: string, onStatus?: (message: string) => void): Promise<Record<string, unknown>[]> {
  const documents: Record<string, unknown>[] = [];
  let offset = 0;
  for (;;) {
    const page = await fetchDocuments(uid, { offset, limit: DOCUMENT_BATCH });
    const rows = page.results ?? [];
    documents.push(...rows);
    offset += rows.length;
    onStatus?.(`${uid}: ${documents.length}/${page.total || documents.length} documents`);
    if (!rows.length || offset >= page.total) break;
  }
  return documents;
}

export async function buildDump(uids: string[], onStatus?: (message: string) => void): Promise<MeiliDump> {
  if (!uids.length) throw new Error('Không có index để dump');
  const indexes: IndexDump[] = [];
  for (const uid of uids) {
    onStatus?.(`Đang đọc ${uid}`);
    const index = await getIndex(uid);
    const settings = settingsForRestore(await getSettings(uid));
    const documents = await fetchAllDocuments(uid, onStatus);
    indexes.push({ uid: index.uid, primaryKey: index.primaryKey, settings, documents });
  }
  return {
    meilipilot: DUMP_VERSION,
    kind: indexes.length === 1 ? 'index' : 'instance',
    dumpedAt: new Date().toISOString(),
    indexes
  };
}

async function ensureIndex(uid: string, primaryKey: string | null) {
  try {
    await getIndex(uid);
  } catch (error) {
    if (!(error instanceof MeiliError) || error.httpStatus !== 404) throw error;
    const task = await createIndex({ uid, primaryKey });
    await waitTask(task.taskUid, { timeoutMs: 300_000 });
  }
}

export async function applyDump(
  dump: MeiliDump,
  opts: { replaceDocuments: boolean; onlyUid?: string; onStatus?: (message: string) => void }
): Promise<string[]> {
  const indexes = opts.onlyUid ? dump.indexes.filter((index) => index.uid === opts.onlyUid) : dump.indexes;
  if (!indexes.length) throw new Error(opts.onlyUid ? `File không có index ${opts.onlyUid}` : 'Dump không có index');
  for (const index of indexes) {
    opts.onStatus?.(`Restore ${index.uid}: settings`);
    await ensureIndex(index.uid, index.primaryKey);
    const settingsTask = await patchSettings(index.uid, settingsForRestore(index.settings));
    await waitTask(settingsTask.taskUid, { timeoutMs: 300_000 });
    if (opts.replaceDocuments) {
      opts.onStatus?.(`Restore ${index.uid}: xóa documents cũ`);
      const deleted = await deleteAllDocuments(index.uid);
      await waitTask(deleted.taskUid, { timeoutMs: 300_000 });
    }
    const batches = documentBatches(index.documents);
    for (let i = 0; i < batches.length; i += 1) {
      opts.onStatus?.(`Restore ${index.uid}: documents ${i + 1}/${batches.length}`);
      const added = await addOrUpdate(index.uid, batches[i], index.primaryKey ?? undefined);
      await waitTask(added.taskUid, { timeoutMs: 300_000 });
    }
  }
  return indexes.map((index) => index.uid);
}
