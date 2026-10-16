export function windowTitle(page: string, indexUid?: string): string {
  if (indexUid) return `MeiliPilot — ${page} · ${indexUid}`;
  return `MeiliPilot — ${page}`;
}

const TITLES: Record<string, string> = {
  dashboard: 'Dashboard',
  indexes: 'Indexes',
  search: 'Search',
  'multi-search': 'Multi-search',
  'settings-diff': 'Settings Diff',
  tasks: 'Tasks',
  keys: 'Keys',
  instance: 'Instance',
  logs: 'Logs',
  chat: 'Chat',
  rules: 'Rules',
  mcp: 'MCP',
  connect: 'Connect'
};

export function titleFromHash(hash: string): string {
  const path = hash.replace(/^#/, '').split('?')[0];
  const parts = path.split('/').filter(Boolean);
  if (!parts.length || parts[0] === 'dashboard') return windowTitle('Dashboard');
  if (parts[0] === 'indexes' && parts[1] && parts[2] === 'search') return windowTitle('Search', parts[1]);
  if (parts[0] === 'indexes' && parts[1] && parts[2] === 'documents') return windowTitle('Documents', parts[1]);
  if (parts[0] === 'indexes' && parts[1] && parts[2] === 'settings') return windowTitle('Settings', parts[1]);
  if (parts[0] === 'indexes' && parts[1]) return windowTitle('Index', parts[1]);
  if (parts[0] === 'tasks' && parts[1]) return windowTitle('Task');
  return windowTitle(TITLES[parts[0]] ?? parts[0]);
}
