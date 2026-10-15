import { describe, expect, it } from 'vitest';
import { COMMANDS, filterCommands } from './command-palette';

describe('filterCommands', () => {
  it('returns every command when the query is empty', () => {
    expect(filterCommands('').map((c) => c.id)).toEqual(COMMANDS.map((c) => c.id));
  });

  it('matches Search by label fragment', () => {
    expect(filterCommands('sea').map((c) => c.id)).toEqual(['search']);
  });

  it('matches Keys by keyword', () => {
    expect(filterCommands('key').map((c) => c.id)).toContain('keys');
  });
});
