import { describe, it, expect } from 'vitest';
import {
  APP_AUTHOR_EMAIL,
  APP_COPYRIGHT,
  APP_FEATURES,
  APP_INTRO,
  APP_NAME,
  APP_PITCH,
  APP_TAGLINE,
  APP_TRUST,
  APP_VERSION
} from './app-meta';

describe('app meta', () => {
  it('names the product and credits the author', () => {
    expect(APP_NAME).toBe('MeiliPilot');
    expect(APP_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
    expect(APP_AUTHOR_EMAIL).toBe('sangnx6297@gmail.com');
    expect(APP_COPYRIGHT).toContain(APP_AUTHOR_EMAIL);
    expect(APP_COPYRIGHT).toContain('2026');
  });

  it('has a production connect-panel pitch', () => {
    expect(APP_TAGLINE).toBe('Desktop client cho Meilisearch');
    expect(APP_PITCH).toMatch(/search/i);
    expect(APP_PITCH).toMatch(/an toàn/i);
    expect(APP_INTRO.toLowerCase()).toContain('dpapi');
    expect(APP_INTRO.toLowerCase()).not.toContain('saas');
    expect(APP_FEATURES).toHaveLength(3);
    expect(APP_FEATURES.every((f) => f.id && f.title && f.body.length > 20)).toBe(true);
    expect(APP_TRUST).toHaveLength(3);
    expect(APP_TRUST.map((t) => t.label)).toEqual(['Local-first', 'DPAPI', 'Windows']);
  });
});
