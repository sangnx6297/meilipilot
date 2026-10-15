import { describe, expect, it } from 'vitest';
import { loadLastHash, saveLastHash } from './workspace-prefs';

describe('last hash', () => {
  it('round-trips a workspace route and ignores connect', () => {
    saveLastHash('#/search');
    expect(loadLastHash()).toBe('#/search');
    saveLastHash('#/connect');
    expect(loadLastHash()).toBe('#/search');
  });
});
