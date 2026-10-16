export type Command = {
  id: string;
  label: string;
  href: string;
  keywords: string[];
  group: 'Workspace' | 'Admin';
};

export const COMMANDS: Command[] = [
  { id: 'dashboard', label: 'Dashboard', href: '#/dashboard', keywords: ['home', 'stats'], group: 'Workspace' },
  { id: 'indexes', label: 'Indexes', href: '#/indexes', keywords: ['index', 'uid'], group: 'Workspace' },
  { id: 'search', label: 'Search', href: '#/search', keywords: ['query', 'q', 'hits'], group: 'Workspace' },
  { id: 'settings-diff', label: 'Settings Diff', href: '#/settings-diff', keywords: ['diff', 'migrate'], group: 'Workspace' },
  { id: 'multi-search', label: 'Multi-search', href: '#/multi-search', keywords: ['federated'], group: 'Workspace' },
  { id: 'tasks', label: 'Tasks', href: '#/tasks', keywords: ['queue', 'job'], group: 'Workspace' },
  { id: 'keys', label: 'Keys', href: '#/keys', keywords: ['key', 'api', 'token'], group: 'Admin' },
  { id: 'instance', label: 'Instance', href: '#/instance', keywords: ['dump', 'experimental'], group: 'Admin' },
  { id: 'logs', label: 'Logs', href: '#/logs', keywords: ['stream', 'stderr', 'log'], group: 'Admin' },
  { id: 'chat', label: 'Chat', href: '#/chat', keywords: ['llm', 'workspace'], group: 'Admin' },
  { id: 'rules', label: 'Rules', href: '#/rules', keywords: ['pin', 'promote'], group: 'Admin' },
  { id: 'mcp', label: 'MCP', href: '#/mcp', keywords: ['agent', 'llm'], group: 'Admin' }
];

export function filterCommands(q: string, commands = COMMANDS): Command[] {
  const n = q.trim().toLowerCase();
  if (!n) return commands;
  return commands.filter(
    (c) =>
      c.id.toLowerCase().startsWith(n) ||
      c.label.toLowerCase().startsWith(n) ||
      c.keywords.some((k) => k.toLowerCase().startsWith(n))
  );
}
