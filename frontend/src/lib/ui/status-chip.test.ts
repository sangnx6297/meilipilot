import { describe, expect, it } from 'vitest';
import { statusChipClass } from './status-chip';

describe('statusChipClass', () => {
  it('maps Meilisearch task statuses to compact chip tones', () => {
    expect(statusChipClass('succeeded')).toBe('status-chip status-chip-succeeded');
    expect(statusChipClass('failed')).toBe('status-chip status-chip-failed');
    expect(statusChipClass('canceled')).toBe('status-chip status-chip-canceled');
    expect(statusChipClass('processing')).toBe('status-chip status-chip-processing');
    expect(statusChipClass('enqueued')).toBe('status-chip status-chip-enqueued');
  });
});
