import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../wailsjs/go/main/App', () => ({
  Connect: vi.fn(async (host: string, _key: string, name: string, environment: string, readOnly: boolean) => ({
    id: '1',
    host,
    name,
    environment,
    readOnly
  })),
  Session: vi.fn(async () => null),
  Disconnect: vi.fn(async () => {}),
  ListProfiles: vi.fn(async () => []),
  UseProfile: vi.fn(async (id: string) => ({
    id,
    host: 'http://127.0.0.1:7700',
    name: 'local',
    environment: 'dev',
    readOnly: false
  })),
  DeleteProfile: vi.fn(async () => {}),
  CopyText: vi.fn(async () => {}),
  SaveTextFile: vi.fn(async (name: string) => name),
  ForwardFor: vi.fn(async () => ({ status: 200, body: '{}' }))
}));

import { Connect, Session, Disconnect, UseProfile, CopyText } from '../../wailsjs/go/main/App';
import { connect, disconnect, currentSession, useProfile, copyText, defaultReadOnlyForEnv, envLabel, envBadgeClass, envChipClass } from './connection';

describe('connection', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls Wails Connect with environment and readOnly', async () => {
    await connect({
      host: 'http://127.0.0.1:7700',
      apiKey: 'k',
      name: 'local',
      environment: 'production',
      readOnly: true
    });
    expect(Connect).toHaveBeenCalledWith('http://127.0.0.1:7700', 'k', 'local', 'production', true);
  });

  it('currentSession returns null when Session is null', async () => {
    vi.mocked(Session).mockResolvedValueOnce(null);
    expect(await currentSession()).toBeNull();
  });

  it('disconnect calls Wails Disconnect', async () => {
    await disconnect();
    expect(Disconnect).toHaveBeenCalled();
  });

  it('useProfile switches saved session', async () => {
    await useProfile('abc');
    expect(UseProfile).toHaveBeenCalledWith('abc');
  });

  it('copyText uses Wails clipboard', async () => {
    await copyText('secret');
    expect(CopyText).toHaveBeenCalledWith('secret');
  });

  it('envLabel maps environments', () => {
    expect(envLabel('production')).toBe('PROD');
    expect(envLabel('dev')).toBe('DEV');
  });

  it('defaults production sessions to readOnly', () => {
    expect(defaultReadOnlyForEnv('production')).toBe(true);
    expect(defaultReadOnlyForEnv('dev')).toBe(false);
    expect(defaultReadOnlyForEnv('staging')).toBe(false);
  });

  it('envBadgeClass marks production as error tone', () => {
    expect(envBadgeClass('production')).toBe('badge-error');
    expect(envBadgeClass('dev')).toBe('badge-success');
  });

  it('envChipClass maps production without daisyUI badge classes', () => {
    expect(envChipClass('production')).toBe('chip-prod');
    expect(envChipClass('dev')).toBe('chip-dev');
    expect(envChipClass('staging')).toBe('chip-staging');
    expect(envChipClass('other')).toBe('chip-muted');
  });
});
