import { describe, expect, it } from 'vitest';
import { capabilitiesFrom, navAllowed, parsePkgVersion } from './capability';

describe('parsePkgVersion', () => {
  it('reads major.minor.patch', () => {
    expect(parsePkgVersion('1.55.0')).toEqual({ major: 1, minor: 55, patch: 0 });
    expect(parsePkgVersion('garbage')).toEqual({ major: 0, minor: 0, patch: 0 });
  });
});

describe('capabilitiesFrom', () => {
  it('keeps chat/network/metrics/rules off until experimental flags are on', () => {
    const caps = capabilitiesFrom('1.55.0', {});
    expect(caps.chat).toBe(false);
    expect(caps.network).toBe(false);
    expect(caps.metrics).toBe(false);
    expect(caps.rules).toBe(false);
    expect(caps.flags.dynamicSearchRules).toBeUndefined();
  });

  it('turns experimental routes on from GET /experimental-features', () => {
    const caps = capabilitiesFrom('1.55.0', {
      chatCompletions: true,
      network: true,
      metrics: true,
      dynamicSearchRules: true,
      containsFilter: false
    });
    expect(caps.chat).toBe(true);
    expect(caps.network).toBe(true);
    expect(caps.metrics).toBe(true);
    expect(caps.rules).toBe(true);
    expect(caps.flags.containsFilter).toBe(false);
    expect(caps.flags.chatCompletions).toBe(true);
  });

  it('does not enable rules from package version alone', () => {
    expect(capabilitiesFrom('1.52.0', { dynamicSearchRules: true }).rules).toBe(true);
    expect(capabilitiesFrom('1.55.0', {}).rules).toBe(false);
  });
});

describe('navAllowed', () => {
  it('keeps chat, rules, and mcp in the menu when their flags are off', () => {
    const off = capabilitiesFrom('1.55.0', {});
    expect(navAllowed('#/chat', off)).toBe(true);
    expect(navAllowed('#/rules', off)).toBe(true);
    expect(navAllowed('#/mcp', off)).toBe(true);
    expect(navAllowed('#/dashboard', off)).toBe(true);
  });
});
