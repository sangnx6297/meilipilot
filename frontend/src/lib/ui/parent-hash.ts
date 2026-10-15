export function parentHash(path: string): string | null {
  const parts = path.split('/').filter(Boolean);
  if (parts.length === 0 || parts[0] === 'dashboard') return null;
  if (parts[0] === 'indexes' && parts.length >= 3) return `#/indexes/${parts[1]}`;
  if (parts[0] === 'indexes' && parts.length === 2) return '#/indexes';
  if (parts[0] === 'tasks' && parts.length >= 2) return '#/tasks';
  return '#/dashboard';
}
