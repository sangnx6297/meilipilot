const LAST_HASH = 'meili.lastHash';

export function saveLastHash(hash: string): void {
  const normalized = hash.startsWith('#') ? hash : `#${hash}`;
  if (!normalized || normalized === '#/connect' || normalized === '#') return;
  localStorage.setItem(LAST_HASH, normalized);
}

export function loadLastHash(): string | null {
  const v = localStorage.getItem(LAST_HASH);
  if (!v || v === '#/connect') return null;
  return v;
}
