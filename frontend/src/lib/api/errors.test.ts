import { describe, it, expect } from 'vitest';
import { MeiliError, classifyError, errorLabel } from './errors';

describe('classifyError', () => {
  it('maps proxy and auth codes', () => {
    expect(classifyError(new MeiliError(502, 'proxy_error', 'system', '', 'dial'))).toBe('network');
    expect(classifyError(new MeiliError(504, 'proxy_timeout', 'system', '', 'timeout'))).toBe('network');
    expect(classifyError(new MeiliError(401, 'invalid_api_key', 'auth', '', 'nope'))).toBe('auth');
    expect(classifyError(new MeiliError(403, 'connection_read_only', 'auth', '', 'ro'))).toBe('readonly');
    expect(classifyError(new MeiliError(403, 'not_enough_permissions', 'auth', '', 'denied'))).toBe('permission');
  });
});

describe('errorLabel', () => {
  it('prefixes Vietnamese kind', () => {
    const e = new MeiliError(403, 'connection_read_only', 'auth', '', 'connection is read-only');
    expect(errorLabel(e)).toContain('Chỉ đọc');
    expect(errorLabel(e)).toContain('connection is read-only');
  });
});
