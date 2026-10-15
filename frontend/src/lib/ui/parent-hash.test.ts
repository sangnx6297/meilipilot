import { describe, it, expect } from 'vitest';
import { parentHash } from './parent-hash';

describe('parentHash', () => {
  it('has no back on dashboard', () => {
    expect(parentHash('/dashboard')).toBeNull();
    expect(parentHash('/')).toBeNull();
    expect(parentHash('')).toBeNull();
  });

  it('sends top-level screens back to dashboard', () => {
    expect(parentHash('/indexes')).toBe('#/dashboard');
    expect(parentHash('/search')).toBe('#/dashboard');
    expect(parentHash('/tasks')).toBe('#/dashboard');
    expect(parentHash('/keys')).toBe('#/dashboard');
  });

  it('walks nested index screens one level up', () => {
    expect(parentHash('/indexes/movies')).toBe('#/indexes');
    expect(parentHash('/indexes/movies/settings')).toBe('#/indexes/movies');
    expect(parentHash('/indexes/movies/documents')).toBe('#/indexes/movies');
    expect(parentHash('/indexes/movies/search')).toBe('#/indexes/movies');
  });

  it('sends task detail back to tasks', () => {
    expect(parentHash('/tasks/12')).toBe('#/tasks');
  });
});
