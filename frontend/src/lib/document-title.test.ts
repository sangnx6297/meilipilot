import { describe, expect, it } from 'vitest';
import { titleFromHash, windowTitle } from './document-title';

describe('windowTitle', () => {
  it('uses page and optional index uid', () => {
    expect(windowTitle('Dashboard')).toBe('MeiliPilot — Dashboard');
    expect(windowTitle('Search', 'movies')).toBe('MeiliPilot — Search · movies');
  });
});

describe('titleFromHash', () => {
  it('maps dashboard, search, and nested index routes', () => {
    expect(titleFromHash('#/dashboard')).toBe('MeiliPilot — Dashboard');
    expect(titleFromHash('/search')).toBe('MeiliPilot — Search');
    expect(titleFromHash('#/indexes/movies/search')).toBe('MeiliPilot — Search · movies');
    expect(titleFromHash('#/indexes/movies/documents')).toBe('MeiliPilot — Documents · movies');
    expect(titleFromHash('#/indexes/movies/settings')).toBe('MeiliPilot — Settings · movies');
    expect(titleFromHash('#/indexes/movies')).toBe('MeiliPilot — Index · movies');
    expect(titleFromHash('#/settings-diff')).toBe('MeiliPilot — Settings Diff');
    expect(titleFromHash('#/tasks/12')).toBe('MeiliPilot — Task');
  });
});
