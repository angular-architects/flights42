import { describe, expect, it } from 'vitest';

import { doNotEditWarning } from './utils.mjs';

describe('doNotEditWarning', () => {
  it('names both the generated target and the source of truth', () => {
    const warning = doNotEditWarning('`.mcp.json`', '`.agents/mcp.json`');

    expect(warning).toContain('`.mcp.json`');
    expect(warning).toContain('`.agents/mcp.json`');
  });
});
