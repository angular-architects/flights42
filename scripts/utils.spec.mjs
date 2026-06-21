import { describe, expect, it } from 'vitest';

import { doNotEditWarning, toCursorHooks } from './utils.mjs';

const claudeStopHooks = {
  Stop: [
    {
      matcher: '',
      hooks: [
        {
          type: 'command',
          command: 'node scripts/hooks/claude-stop-hook.mjs',
          timeout: 600,
        },
      ],
    },
  ],
};

describe('toCursorHooks', () => {
  it('flattens a Claude hook group into Cursor format', () => {
    expect(toCursorHooks(claudeStopHooks)).toEqual({
      stop: [
        {
          command: 'node scripts/hooks/cursor-stop-hook.mjs',
          timeout: 600,
          loop_limit: 3,
        },
      ],
    });
  });

  it('flattens multiple groups and hooks into a single event array', () => {
    const result = toCursorHooks({
      Stop: [
        { matcher: '', hooks: [{ command: 'a', timeout: 1 }] },
        {
          matcher: '',
          hooks: [
            { command: 'b', timeout: 2 },
            { command: 'c', timeout: 3 },
          ],
        },
      ],
    });

    expect(result.stop).toHaveLength(3);
  });

  it('throws on an unmapped hook event', () => {
    expect(() => {
      return toCursorHooks({ PreToolUse: [] });
    }).toThrow(/no Cursor mapping/);
  });
});

describe('doNotEditWarning', () => {
  it('names both the generated target and the source of truth', () => {
    const warning = doNotEditWarning('`.mcp.json`', '`.agents/mcp.json`');

    expect(warning).toContain('`.mcp.json`');
    expect(warning).toContain('`.agents/mcp.json`');
  });
});
