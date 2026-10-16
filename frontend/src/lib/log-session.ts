export const LOG_LEVELS = ['error', 'warn', 'info', 'debug', 'trace'] as const;
export type LogLevel = (typeof LOG_LEVELS)[number];
export type LogMode = 'human' | 'json' | 'profile';

export function isLogLevel(value: string): value is LogLevel {
  return (LOG_LEVELS as readonly string[]).includes(value);
}

export function onLogsPage(path: string): boolean {
  return path === '/logs' || path.startsWith('/logs/');
}

export function shouldDetachLogs(path: string, live: boolean): boolean {
  return live && !onLogsPage(path);
}
