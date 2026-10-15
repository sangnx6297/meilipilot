import { describe, expect, it } from 'vitest';
import { capabilitiesFrom, navAllowed, parsePkgVersion } from './capability';

describe('parsePkgVersion', () => {
  it('reads major.minor.patch', () => {
    expect(parsePkgVersion('1.55.0')).toEqual({ major: 1, minor: 55, patch: 0 });
    expect(parsePkgVersion('garbage')).toEqual({ major: 0, minor: 0, patch: 0 });
  });
});

describe('capabilitiesFrom', () => {
  it('keeps chat/network/metrics off until experimental flags are on', () => {
    const caps = capabilitiesFrom('1.55.0', {});
    expect(caps.chat).toBe(false);
    expect(caps.network).toBe(false);
    expect(caps.metrics).toBe(false);
    expect(caps.rules).toBe(true);
  });

  it('turns experimental routes on from GET /experimental-features', () => {
    const caps = capabilitiesFrom('1.55.0', {
      chatCompletions: true,
      network: true,
      metrics: true
    });
    expect(caps.chat).toBe(true);
    expect(caps.network).toBe(true);
    expect(caps.metrics).toBe(true);
  });

  it('hides rules on engines older than 1.53', () => {
    expect(capabilitiesFrom('1.52.0', {}).rules).toBe(false);
  });
});

describe('navAllowed', () => {
  it('hides chat and rules when capability is off', () => {
    const off = capabilitiesFrom('1.55.0', {});
    expect(navAllowed('#/chat', off)).toBe(false);
    expect(navAllowed('#/rules', off)).toBe(true);
    expect(navAllowed('#/dashboard', off)).toBe(true);
    const noRules = capabilitiesFrom('1.40.0', {});
    expect(navAllowed('#/rules', noRules)).toBe(false);
  });
});
