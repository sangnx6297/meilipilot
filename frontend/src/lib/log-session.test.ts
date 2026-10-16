import { describe, expect, it } from 'vitest';
import { shouldDetachLogs } from './log-session';

describe('log detach', () => {
  it('keeps the stream on its own pane after leaving Logs', () => {
    expect(shouldDetachLogs('/tasks', true)).toBe(true);
    expect(shouldDetachLogs('/logs', true)).toBe(false);
    expect(shouldDetachLogs('/tasks', false)).toBe(false);
  });
});
