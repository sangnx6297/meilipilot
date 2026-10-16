export type RemoteDraft = {
  name: string;
  url: string;
  searchApiKey: string;
  writeApiKey: string;
};

export type NetworkDraft = {
  self: string;
  leader: string;
  remotes: RemoteDraft[];
};

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

export function networkDraft(raw: unknown): NetworkDraft {
  const body = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const remotesRaw =
    body.remotes && typeof body.remotes === 'object' && !Array.isArray(body.remotes)
      ? (body.remotes as Record<string, unknown>)
      : {};
  const remotes: RemoteDraft[] = [];
  for (const [name, value] of Object.entries(remotesRaw)) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) continue;
    const row = value as Record<string, unknown>;
    remotes.push({
      name,
      url: text(row.url),
      searchApiKey: text(row.searchApiKey),
      writeApiKey: text(row.writeApiKey)
    });
  }
  return { self: text(body.self), leader: text(body.leader), remotes };
}

export function networkPatch(draft: NetworkDraft, removed: string[]): Record<string, unknown> {
  const remotes: Record<string, unknown> = {};
  for (const name of removed) {
    const id = name.trim();
    if (id) remotes[id] = null;
  }
  for (const row of draft.remotes) {
    const name = row.name.trim();
    if (!name) continue;
    const item: Record<string, string> = {};
    if (row.url.trim()) item.url = row.url.trim();
    if (row.searchApiKey.trim()) item.searchApiKey = row.searchApiKey.trim();
    if (row.writeApiKey.trim()) item.writeApiKey = row.writeApiKey.trim();
    remotes[name] = item;
  }
  const body: Record<string, unknown> = { remotes };
  if (draft.self.trim()) body.self = draft.self.trim();
  if (draft.leader.trim()) body.leader = draft.leader.trim();
  return body;
}
