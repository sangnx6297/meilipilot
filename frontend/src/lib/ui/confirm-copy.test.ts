import { describe, expect, it } from 'vitest';
import { confirmBody } from './confirm-copy';

describe('confirmBody', () => {
  it('joins env, host, and uid above the action detail', () => {
    expect(
      confirmBody({
        env: 'production',
        host: 'http://prod:7700',
        uid: 'movies',
        detail: 'Xóa index movies?'
      })
    ).toBe('PROD · http://prod:7700 · movies\nXóa index movies?');
  });

  it('omits missing bits', () => {
    expect(confirmBody({ detail: 'Xóa session đã lưu?' })).toBe('Xóa session đã lưu?');
  });
});
