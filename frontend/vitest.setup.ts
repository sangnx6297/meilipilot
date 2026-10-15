import { setTransport } from './src/lib/api/client';

setTransport(async ({ method, path, query, body }) => {
  const p = new URLSearchParams();
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null || v === '') continue;
      p.set(k, String(v));
    }
  }
  const qs = p.toString();
  const res = await fetch(`/meili${path}${qs ? `?${qs}` : ''}`, {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, body: JSON.stringify(json) };
});
